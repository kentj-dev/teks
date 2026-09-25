mod events;
mod health;
mod messages;
mod provider;

use std::sync::Arc;

use axum::{Router, routing::get};

use crate::{AppState, providers::Provider, web};

pub fn router(state: Arc<AppState>) -> Router {
    let router = Router::new()
        .route("/api/health", get(health::health))
        .route("/api/events", get(events::events))
        .route(
            "/api/_teks/provider",
            get(provider::get_provider).put(provider::update_provider),
        )
        .route("/api/_teks/providers", get(provider::list_providers))
        .route(
            "/api/_teks/messages",
            get(messages::inbox_list_messages).delete(messages::inbox_clear_messages),
        )
        .route(
            "/api/_teks/messages/{id}",
            get(messages::inbox_get_message).delete(messages::inbox_delete_message),
        );
    Provider::ALL
        .iter()
        .fold(router, |router, provider| {
            router.merge((provider.spec().routes)())
        })
        .fallback(web::serve)
        .with_state(state)
}

/// Public endpoints of Teks' native REST provider.
pub fn rest_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/api/messages",
            get(messages::list_messages)
                .post(messages::create_message)
                .delete(messages::clear_messages),
        )
        .route(
            "/api/messages/{id}",
            get(messages::get_message).delete(messages::delete_message),
        )
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use http_body_util::BodyExt;
    use serde_json::{Value, json};
    use tower::ServiceExt;
    use uuid::Uuid;

    use super::router;
    use crate::{
        AppState,
        database::Database,
        events::EventBus,
        providers::{Provider, ProviderSelection},
    };

    async fn test_app() -> axum::Router {
        test_app_with_provider(Provider::Rest).await
    }

    async fn test_app_with_provider(provider: Provider) -> axum::Router {
        let directory = std::env::temp_dir().join(format!("teks-test-{}", Uuid::new_v4()));
        let database = Database::open(Some(&directory))
            .await
            .expect("test database");
        router(Arc::new(AppState {
            database,
            events: EventBus::new(),
            provider: ProviderSelection::new(provider),
        }))
    }

    async fn json_body(response: axum::response::Response) -> Value {
        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes();
        serde_json::from_slice(&bytes).expect("JSON response")
    }

    async fn post_form(app: &axum::Router, path: &str, form: &str) -> axum::response::Response {
        app.clone()
            .oneshot(
                Request::post(path)
                    .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
                    .body(Body::from(form.to_owned()))
                    .expect("request"),
            )
            .await
            .expect("form response")
    }

    async fn get(app: &axum::Router, path: &str) -> axum::response::Response {
        app.clone()
            .oneshot(Request::get(path).body(Body::empty()).expect("request"))
            .await
            .expect("get response")
    }

    #[tokio::test]
    async fn captures_and_retrieves_a_message() {
        let app = test_app().await;
        let response = app
            .clone()
            .oneshot(
                Request::post("/api/messages")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        json!({
                            "to": "09171234567",
                            "from": "MyApp",
                            "message": "Your OTP is 123456",
                            "test_context": { "suite": "signup" }
                        })
                        .to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("create response");
        assert_eq!(response.status(), StatusCode::CREATED);
        let created = json_body(response).await;
        assert_eq!(created["success"], true);
        assert_eq!(created["status"], "delivered");
        assert!(Uuid::parse_str(created["id"].as_str().expect("UUID string")).is_ok());

        let response = app
            .oneshot(
                Request::get("/api/messages")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("list response");
        assert_eq!(response.status(), StatusCode::OK);
        let listed = json_body(response).await;
        assert_eq!(listed[0]["to"], "09171234567");
        assert_eq!(listed[0]["message"], "Your OTP is 123456");
        assert_eq!(listed[0]["payload"]["from"], "MyApp");
        assert_eq!(listed[0]["payload"]["test_context"]["suite"], "signup");
    }

    #[tokio::test]
    async fn returns_consistent_validation_errors() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::post("/api/messages")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(json!({ "message": "Hello" }).to_string()))
                    .expect("request"),
            )
            .await
            .expect("validation response");
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json_body(response).await,
            json!({ "success": false, "error": "The 'to' field is required." })
        );
    }

    #[tokio::test]
    async fn semaphore_captures_single_and_query_string_messages() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let response = post_form(
            &app,
            "/api/v4/messages",
            "apikey=local&number=09171234567&message=Hello+from+Teks&sendername=MyApp",
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let created = json_body(response).await;
        assert_eq!(created.as_array().expect("message array").len(), 1);
        assert_eq!(created[0]["message_id"], 1);
        assert_eq!(created[0]["recipient"], "09171234567");
        assert_eq!(created[0]["sender_name"], "MyApp");
        assert_eq!(created[0]["status"], "Sent");
        assert_eq!(created[0]["type"], "Single");
        assert_eq!(created[0]["network"], "Unknown");

        let response = post_form(
            &app,
            "/api/v4/messages?apikey=query-key&number=09181234567&message=From+query",
            "",
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let created = json_body(response).await;
        assert_eq!(created[0]["recipient"], "09181234567");
        assert_eq!(created[0]["sender_name"], "Teks");
    }

    #[tokio::test]
    async fn semaphore_accepts_raw_json_requests() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let response = app
            .clone()
            .oneshot(
                Request::post("/api/v4/messages")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        json!({
                            "apikey": "local",
                            "number": "09171234567",
                            "message": "Hello from Teks",
                            "sendername": "MyApp"
                        })
                        .to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("JSON response");

        assert_eq!(response.status(), StatusCode::OK);
        let created = json_body(response).await;
        assert_eq!(created[0]["recipient"], "09171234567");
        assert_eq!(created[0]["message"], "Hello from Teks");
        assert_eq!(created[0]["sender_name"], "MyApp");

        let inbox = json_body(get(&app, "/api/_teks/messages").await).await;
        assert_eq!(inbox[0]["payload"]["apikey"], "********");
    }

    #[tokio::test]
    async fn semaphore_validates_required_parameters() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        for (form, error) in [
            (
                "number=09171234567&message=Hello",
                "The 'apikey' parameter is required.",
            ),
            (
                "apikey=local&message=Hello",
                "The 'number' parameter is required.",
            ),
            (
                "apikey=local&number=09171234567",
                "The 'message' parameter is required.",
            ),
        ] {
            let response = post_form(&app, "/api/v4/messages", form).await;
            assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
            assert_eq!(json_body(response).await["error"], error);
        }
    }

    #[tokio::test]
    async fn semaphore_supports_bulk_and_enforces_the_recipient_limit() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let response = post_form(
            &app,
            "/api/v4/messages",
            "apikey=local&number=09171234567,%2009181234567,,09191234567&message=Bulk",
        )
        .await;
        let created = json_body(response).await;
        assert_eq!(created.as_array().expect("message array").len(), 3);
        assert!(
            created
                .as_array()
                .unwrap()
                .iter()
                .all(|item| item["type"] == "Bulk")
        );

        let recipients = (0..1000)
            .map(|index| format!("09{index:09}"))
            .collect::<Vec<_>>()
            .join(",");
        let response = post_form(
            &app,
            "/api/v4/messages",
            &format!("apikey=local&number={recipients}&message=Maximum"),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(json_body(response).await.as_array().unwrap().len(), 1000);

        let too_many = format!("{recipients},09999999999");
        let response = post_form(
            &app,
            "/api/v4/messages",
            &format!("apikey=local&number={too_many}&message=Too+many"),
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[tokio::test]
    async fn semaphore_captures_priority_messages() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let response = post_form(
            &app,
            "/api/v4/priority",
            "apikey=local&number=09171234567&message=Important",
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(json_body(response).await[0]["type"], "Priority");
    }

    #[tokio::test]
    async fn semaphore_handles_generated_and_provided_otp_codes() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let response = post_form(
            &app,
            "/api/v4/otp",
            "apikey=local&number=09171234567&message=Your+OTP+is+%7Botp%7D",
        )
        .await;
        let generated = json_body(response).await;
        let code = generated[0]["code"]
            .as_u64()
            .expect("generated numeric code");
        assert!((100_000..=999_999).contains(&code));
        assert_eq!(generated[0]["message"], format!("Your OTP is {code}"));

        let response = post_form(
            &app,
            "/api/v4/otp",
            "apikey=local&number=09181234567&message=Code%3A+%7Botp%7D+%2F+%7Botp%7D&code=123456",
        )
        .await;
        let provided = json_body(response).await;
        assert_eq!(provided[0]["code"], 123456);
        assert_eq!(provided[0]["message"], "Code: 123456 / 123456");

        let response = post_form(
            &app,
            "/api/v4/otp",
            "apikey=local&number=09191234567&message=Thanks+for+registering&code=654321",
        )
        .await;
        assert_eq!(
            json_body(response).await[0]["message"],
            "Thanks for registering Your One Time Password is 654321"
        );
    }

    #[tokio::test]
    async fn semaphore_lists_filters_paginates_and_gets_messages() {
        let app = test_app().await;
        let rest_response = app
            .clone()
            .oneshot(
                Request::post("/api/messages")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        json!({ "to": "09990000000", "message": "REST only" }).to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("REST response");
        assert_eq!(rest_response.status(), StatusCode::CREATED);
        let switched = app
            .clone()
            .oneshot(
                Request::put("/api/_teks/provider")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(json!({ "provider": "semaphore" }).to_string()))
                    .expect("request"),
            )
            .await
            .expect("provider response");
        assert_eq!(switched.status(), StatusCode::OK);

        for number in ["09170000001", "09170000002", "09170000003"] {
            let response = post_form(
                &app,
                "/api/v4/messages",
                &format!("apikey=local&number={number}&message=Semaphore"),
            )
            .await;
            assert_eq!(response.status(), StatusCode::OK);
        }

        let listed = json_body(get(&app, "/api/v4/messages?apikey=local").await).await;
        assert_eq!(listed.as_array().unwrap().len(), 3);
        assert!(
            listed
                .as_array()
                .unwrap()
                .iter()
                .all(|item| item["message"] != "REST only")
        );

        let page_one =
            json_body(get(&app, "/api/v4/messages?apikey=local&limit=1&page=1").await).await;
        let page_two =
            json_body(get(&app, "/api/v4/messages?apikey=local&limit=1&page=2").await).await;
        assert_eq!(page_one.as_array().unwrap().len(), 1);
        assert_eq!(page_two.as_array().unwrap().len(), 1);
        assert_ne!(page_one[0]["message_id"], page_two[0]["message_id"]);

        let today = chrono::Utc::now().date_naive();
        let tomorrow = today + chrono::Duration::days(1);
        let dated = json_body(
            get(
                &app,
                &format!("/api/v4/messages?apikey=local&startDate={today}&endDate={today}"),
            )
            .await,
        )
        .await;
        assert_eq!(dated.as_array().unwrap().len(), 3);
        let future = json_body(
            get(
                &app,
                &format!("/api/v4/messages?apikey=local&startDate={tomorrow}"),
            )
            .await,
        )
        .await;
        assert!(future.as_array().unwrap().is_empty());

        let filtered = json_body(
            get(
                &app,
                "/api/v4/messages?apikey=local&status=sent&network=unknown",
            )
            .await,
        )
        .await;
        assert_eq!(filtered.as_array().unwrap().len(), 3);
        let none = json_body(get(&app, "/api/v4/messages?apikey=local&status=failed").await).await;
        assert!(none.as_array().unwrap().is_empty());

        let id = page_one[0]["message_id"].as_i64().unwrap();
        let found = get(&app, &format!("/api/v4/messages/{id}?apikey=local")).await;
        assert_eq!(found.status(), StatusCode::OK);
        assert_eq!(json_body(found).await["message_id"], id);
        assert_eq!(
            get(&app, "/api/v4/messages/999999?apikey=local")
                .await
                .status(),
            StatusCode::NOT_FOUND
        );
    }

    #[tokio::test]
    async fn semaphore_returns_local_account_resources() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let account = json_body(get(&app, "/api/v4/account?apikey=local").await).await;
        assert_eq!(account["account_id"], 1);
        assert_eq!(account["account_name"], "Teks Local");
        assert_eq!(account["status"], "Active");
        assert_eq!(account["credit_balance"], 999999);

        let names = json_body(get(&app, "/api/v4/account/sendernames?apikey=local").await).await;
        assert_eq!(names[0]["name"], "Teks");
        let users = json_body(get(&app, "/api/v4/account/users?apikey=local").await).await;
        assert_eq!(users[0]["email"], "local@teks");
        let transactions =
            json_body(get(&app, "/api/v4/account/transactions?apikey=local").await).await;
        assert!(transactions.as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn semaphore_never_persists_api_keys() {
        let app = test_app_with_provider(Provider::Semaphore).await;
        let secret = "DO_NOT_STORE_THIS_KEY";
        let response = post_form(
            &app,
            "/api/v4/messages",
            &format!("apikey={secret}&number=09171234567&message=Safe"),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let inbox = json_body(get(&app, "/api/_teks/messages").await).await;
        let serialized = serde_json::to_string(&inbox).unwrap();
        assert!(!serialized.contains(secret));
        assert_eq!(inbox[0]["payload"]["apikey"], "********");
        assert_eq!(inbox[0]["provider"], "semaphore");
        assert!(inbox[0]["provider_message_id"].is_number());
    }

    #[tokio::test]
    async fn selected_provider_exclusively_gates_public_endpoints() {
        let app = test_app().await;
        assert_eq!(
            json_body(get(&app, "/api/_teks/provider").await).await["provider"],
            "rest"
        );

        let semaphore_while_rest = post_form(
            &app,
            "/api/v4/messages",
            "apikey=local&number=09171234567&message=Blocked",
        )
        .await;
        assert_eq!(semaphore_while_rest.status(), StatusCode::CONFLICT);
        assert_eq!(
            json_body(semaphore_while_rest).await["error"],
            "REST API is selected. Only REST API endpoints under '/api/messages' can be used. Change the provider in the inbox or start Teks with '--provider semaphore'."
        );

        let switched = app
            .clone()
            .oneshot(
                Request::put("/api/_teks/provider")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(json!({ "provider": "semaphore" }).to_string()))
                    .expect("request"),
            )
            .await
            .expect("provider response");
        assert_eq!(switched.status(), StatusCode::OK);
        assert_eq!(json_body(switched).await["provider"], "semaphore");

        let rest_while_semaphore = app
            .clone()
            .oneshot(
                Request::post("/api/messages")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        json!({ "to": "09171234567", "message": "Blocked" }).to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("REST response");
        assert_eq!(rest_while_semaphore.status(), StatusCode::CONFLICT);
        assert_eq!(
            json_body(rest_while_semaphore).await["error"],
            "Semaphore is selected. Only Semaphore endpoints under '/api/v4' can be used. Change the provider in the inbox or start Teks with '--provider rest'."
        );

        let semaphore = post_form(
            &app,
            "/api/v4/messages",
            "apikey=local&number=09171234567&message=Allowed",
        )
        .await;
        assert_eq!(semaphore.status(), StatusCode::OK);

        // Private inbox endpoints remain available to the browser in every provider mode.
        assert_eq!(
            get(&app, "/api/_teks/messages").await.status(),
            StatusCode::OK
        );
    }
}
