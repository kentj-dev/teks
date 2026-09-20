mod events;
mod health;
mod messages;

use std::sync::Arc;

use axum::{Router, routing::get};

use crate::{AppState, web};

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/health", get(health::health))
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
        .route("/api/events", get(events::events))
        .fallback(web::serve)
        .with_state(state)
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
    use crate::{AppState, database::Database, events::EventBus};

    async fn test_app() -> axum::Router {
        let directory = std::env::temp_dir().join(format!("teks-test-{}", Uuid::new_v4()));
        let database = Database::open(Some(&directory))
            .await
            .expect("test database");
        router(Arc::new(AppState {
            database,
            events: EventBus::new(),
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
}
