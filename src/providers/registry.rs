//! Every provider Teks can emulate is declared in this file.
//!
//! To add a provider, implement its adapter module (routes + normalization), then add one line to
//! the `providers!` invocation and write its `ProviderSpec` function below. The backend banner,
//! CLI `--provider` values, endpoint gating, and the entire inbox UI (onboarding cards, endpoint
//! docs, cURL example, inspector fields) all read from here. To remove a provider, delete both.

use std::sync::{Arc, LazyLock};

use axum::Router;
use clap::ValueEnum;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

macro_rules! providers {
    ($($(#[$meta:meta])* $variant:ident => $id:literal => $spec:ident),+ $(,)?) => {
        #[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize, ValueEnum)]
        pub enum Provider {
            $(
                $(#[$meta])*
                #[serde(rename = $id)]
                #[value(name = $id)]
                $variant,
            )+
        }

        impl Provider {
            pub const ALL: &[Provider] = &[$(Provider::$variant),+];

            pub fn id(self) -> &'static str {
                match self {
                    $(Provider::$variant => $id,)+
                }
            }

            fn build_spec(self) -> ProviderSpec {
                match self {
                    $(Provider::$variant => $spec(),)+
                }
            }
        }
    };
}

providers! {
    #[default]
    Rest => "rest" => rest,
    Semaphore => "semaphore" => semaphore,
    Twilio => "twilio" => twilio,
}

impl Provider {
    pub fn spec(self) -> &'static ProviderSpec {
        static SPECS: LazyLock<Vec<ProviderSpec>> =
            LazyLock::new(|| Provider::ALL.iter().map(|p| p.build_spec()).collect());
        &SPECS[self as usize]
    }

    pub fn label(self) -> &'static str {
        self.spec().label
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSpec {
    pub id: &'static str,
    pub label: &'static str,
    /// Shown on the provider's onboarding card.
    pub description: &'static str,
    /// An `IconName` from `web/src/components/ui/Icon.tsx`.
    pub icon: &'static str,
    /// Prefix of every public endpoint, named in the error when another provider is selected.
    pub base_path: &'static str,
    /// The main "send an SMS" endpoint, shown in the banner, onboarding card, and empty inbox.
    pub send_path: &'static str,
    /// cURL example for the empty inbox. `{endpoint}` is replaced with the full send URL.
    pub example: &'static str,
    /// Credentials every public endpoint requires, if any.
    pub auth: Option<AuthDoc>,
    /// Example values for the `:name` segments used in `endpoints` paths.
    pub path_params: Vec<ParamDoc>,
    pub endpoints: Vec<EndpointDoc>,
    /// Extra inspector rows for this provider's messages.
    pub detail_fields: Vec<DetailField>,
    #[serde(skip)]
    pub routes: fn() -> Router<Arc<AppState>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase", tag = "scheme")]
pub enum AuthDoc {
    /// HTTP Basic auth. Any non-empty credentials are accepted locally.
    Basic {
        username: &'static str,
        password: &'static str,
    },
}

#[derive(Serialize)]
pub struct ParamDoc {
    pub name: &'static str,
    pub example: &'static str,
    pub note: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointDoc {
    pub method: &'static str,
    pub path: &'static str,
    pub description: &'static str,
    /// Status code of a successful response.
    pub status: u16,
    pub request: Option<RequestDoc>,
    pub response: Option<Value>,
}

#[derive(Serialize)]
pub struct RequestDoc {
    pub encoding: Encoding,
    /// Example fields as a JSON object (or the literal JSON body for `Encoding::Json`).
    pub fields: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Encoding {
    Json,
    Form,
    Query,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetailField {
    pub label: &'static str,
    /// JSON Pointer into the stored message, e.g. `/payload/network`.
    pub pointer: &'static str,
    /// Shown when the value is missing. `None` hides the row instead.
    pub fallback: Option<&'static str>,
}

fn endpoint(
    method: &'static str,
    path: &'static str,
    description: &'static str,
    status: u16,
) -> EndpointDoc {
    EndpointDoc {
        method,
        path,
        description,
        status,
        request: None,
        response: None,
    }
}

impl EndpointDoc {
    fn sends(mut self, encoding: Encoding, fields: Value) -> Self {
        self.request = Some(RequestDoc { encoding, fields });
        self
    }

    fn responds(mut self, response: Value) -> Self {
        self.response = Some(response);
        self
    }
}

fn rest() -> ProviderSpec {
    let sample = json!({
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "provider": "rest",
        "to": "09171234567",
        "from": "MyApp",
        "message": "Your OTP is 123456",
        "status": "delivered",
        "created_at": "2026-09-20T10:30:00Z",
    });

    ProviderSpec {
        id: Provider::Rest.id(),
        label: "REST API",
        description: "Use Teks’ native JSON API for local SMS capture.",
        icon: "developer",
        base_path: "/api/messages",
        send_path: "/api/messages",
        example: "curl -X POST {endpoint} \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"to\": \"09171234567\",\n    \"from\": \"MyApp\",\n    \"message\": \"Your OTP is 123456\"\n  }'",
        auth: None,
        path_params: vec![ParamDoc {
            name: "uuid",
            example: "550e8400-e29b-41d4-a716-446655440000",
            note: "The \"id\" returned when the message was captured.",
        }],
        endpoints: vec![
            endpoint("GET", "/api/health", "Check whether Teks is running.", 200)
                .responds(json!({ "status": "ok", "service": "Teks" })),
            endpoint(
                "POST",
                "/api/messages",
                "Capture an outgoing SMS message.",
                201,
            )
            .sends(
                Encoding::Json,
                json!({ "to": "09171234567", "from": "MyApp", "message": "Your OTP is 123456" }),
            )
            .responds(json!({
                "success": true,
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "delivered",
                "message": "Message captured by Teks",
            })),
            endpoint("GET", "/api/messages", "List messages, newest first.", 200)
                .responds(json!([sample])),
            endpoint(
                "GET",
                "/api/messages/:uuid",
                "Retrieve one captured message.",
                200,
            )
            .responds(sample.clone()),
            endpoint(
                "DELETE",
                "/api/messages/:uuid",
                "Delete one captured message.",
                200,
            )
            .responds(json!({ "success": true, "deleted": 1 })),
            endpoint(
                "DELETE",
                "/api/messages",
                "Clear every captured message.",
                200,
            )
            .responds(json!({ "success": true, "deleted": 12 })),
            endpoint("GET", "/api/events", "Subscribe to live SSE updates.", 200)
                .responds(json!({ "event": "new-message", "data": sample })),
        ],
        detail_fields: Vec::new(),
        routes: crate::api::rest_routes,
    }
}

fn semaphore() -> ProviderSpec {
    let sample = json!({
        "message_id": 1,
        "user_id": 1,
        "user": "local@teks",
        "account_id": 1,
        "account": "Teks Local",
        "recipient": "09171234567",
        "message": "Hello from Teks",
        "sender_name": "MyApp",
        "network": "Unknown",
        "status": "Sent",
        "type": "Single",
        "source": "Api",
        "created_at": "2026-09-20 18:30:00",
        "updated_at": "2026-09-20 18:30:00",
    });
    let api_key = || json!({ "apikey": "local" });

    ProviderSpec {
        id: Provider::Semaphore.id(),
        label: "Semaphore",
        description: "Use Semaphore-compatible endpoints with your existing integration.",
        icon: "phone",
        base_path: "/api/v4",
        send_path: "/api/v4/messages",
        example: "curl --data \\\n  \"apikey=local&number=09171234567&message=Your OTP is 123456&sendername=MyApp\" \\\n  {endpoint}",
        // Semaphore authenticates with an `apikey` parameter on each request instead.
        auth: None,
        path_params: vec![ParamDoc {
            name: "id",
            example: "1",
            note: "The \"message_id\" returned when the message was sent.",
        }],
        endpoints: vec![
            endpoint("POST", "/api/v4/messages", "Capture one or up to 1,000 messages.", 200)
                .sends(
                    Encoding::Form,
                    json!({ "apikey": "local", "number": "09171234567", "message": "Hello from Teks", "sendername": "MyApp" }),
                )
                .responds(json!([sample])),
            endpoint("POST", "/api/v4/priority", "Capture a priority message.", 200)
                .sends(
                    Encoding::Form,
                    json!({ "apikey": "local", "number": "09171234567", "message": "Important message", "sendername": "MyApp" }),
                ),
            endpoint("POST", "/api/v4/otp", "Capture an OTP message with an optional code.", 200)
                .sends(
                    Encoding::Form,
                    json!({ "apikey": "local", "number": "09171234567", "message": "Your OTP is {otp}", "code": "123456" }),
                ),
            endpoint("GET", "/api/v4/messages", "List captured Semaphore messages.", 200)
                .sends(Encoding::Query, api_key())
                .responds(json!([sample])),
            endpoint("GET", "/api/v4/messages/:id", "Retrieve one message by numeric ID.", 200)
                .sends(Encoding::Query, api_key())
                .responds(sample),
            endpoint("GET", "/api/v4/account", "Retrieve the simulated local account.", 200)
                .sends(Encoding::Query, api_key())
                .responds(json!({ "account_id": 1, "account_name": "Teks Local", "status": "Active", "credit_balance": 999999 })),
            endpoint("GET", "/api/v4/account/transactions", "List simulated account transactions.", 200)
                .sends(Encoding::Query, api_key())
                .responds(json!([])),
            endpoint("GET", "/api/v4/account/sendernames", "List local sender names.", 200)
                .sends(Encoding::Query, api_key())
                .responds(json!([{ "name": "Teks", "status": "Active", "created_at": "2026-01-01 00:00:00" }])),
            endpoint("GET", "/api/v4/account/users", "List simulated account users.", 200)
                .sends(Encoding::Query, api_key())
                .responds(json!([{ "user_id": 1, "email": "local@teks", "role": "Owner", "status": "Active" }])),
        ],
        detail_fields: vec![
            DetailField {
                label: "Semaphore Message ID",
                pointer: "/provider_message_id",
                fallback: Some("—"),
            },
            DetailField {
                label: "Type",
                pointer: "/payload/type",
                fallback: Some("Single"),
            },
            DetailField {
                label: "Network",
                pointer: "/payload/network",
                fallback: Some("Unknown"),
            },
            DetailField {
                label: "OTP Code",
                pointer: "/payload/code_text",
                fallback: None,
            },
        ],
        routes: super::semaphore::routes::router,
    }
}

fn twilio() -> ProviderSpec {
    const ACCOUNT: &str = "AC00000000000000000000000000000000";
    let sample = json!({
        "account_sid": ACCOUNT,
        "api_version": "2010-04-01",
        "body": "Your OTP is 123456",
        "date_created": "Sun, 20 Sep 2026 10:30:00 +0000",
        "date_sent": "Sun, 20 Sep 2026 10:30:00 +0000",
        "date_updated": "Sun, 20 Sep 2026 10:30:00 +0000",
        "direction": "outbound-api",
        "error_code": null,
        "error_message": null,
        "from": "+15017122661",
        "messaging_service_sid": null,
        "num_media": "0",
        "num_segments": "1",
        "price": null,
        "price_unit": "USD",
        "sid": "SM550e8400e29b41d4a716446655440000",
        "status": "delivered",
        "subresource_uris": {
            "feedback": "/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages/SM550e8400e29b41d4a716446655440000/Feedback.json",
            "media": "/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages/SM550e8400e29b41d4a716446655440000/Media.json",
        },
        "to": "+15558675310",
        "uri": "/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages/SM550e8400e29b41d4a716446655440000.json",
    });

    ProviderSpec {
        id: Provider::Twilio.id(),
        label: "Twilio",
        description: "Use Twilio Messaging endpoints with your existing SDK or HTTP client.",
        icon: "globe",
        base_path: "/2010-04-01",
        send_path: "/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages.json",
        example: "curl -X POST {endpoint} \\\n  -u AC00000000000000000000000000000000:local \\\n  --data-urlencode \"To=+15558675310\" \\\n  --data-urlencode \"From=+15017122661\" \\\n  --data-urlencode \"Body=Your OTP is 123456\"",
        auth: Some(AuthDoc::Basic {
            username: ACCOUNT,
            password: "local",
        }),
        path_params: vec![
            ParamDoc {
                name: "AccountSid",
                example: ACCOUNT,
                note: "Any AC… value. Messages are listed per Account SID.",
            },
            ParamDoc {
                name: "Sid",
                example: "SM550e8400e29b41d4a716446655440000",
                note: "The \"sid\" returned when the message was created.",
            },
        ],
        endpoints: vec![
            endpoint(
                "POST",
                "/2010-04-01/Accounts/:AccountSid/Messages.json",
                "Capture a message. Needs To, From or MessagingServiceSid, and Body, MediaUrl, or ContentSid.",
                201,
            )
            .sends(
                Encoding::Form,
                json!({ "To": "+15558675310", "From": "+15017122661", "Body": "Your OTP is 123456" }),
            )
            .responds(sample.clone()),
            endpoint(
                "GET",
                "/2010-04-01/Accounts/:AccountSid/Messages.json",
                "List messages, newest first. Optional filters: To, From, DateSent, DateSent<, DateSent>, PageSize, Page.",
                200,
            )
            .sends(Encoding::Query, json!({ "PageSize": "50" }))
            .responds(json!({
                "end": 0,
                "first_page_uri": "/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages.json?PageSize=50&Page=0",
                "next_page_uri": null,
                "page": 0,
                "page_size": 50,
                "previous_page_uri": null,
                "start": 0,
                "uri": "/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages.json?PageSize=50&Page=0",
                "messages": [sample],
            })),
            endpoint(
                "GET",
                "/2010-04-01/Accounts/:AccountSid/Messages/:Sid.json",
                "Fetch one message by its SM… SID.",
                200,
            )
            .responds(sample),
            endpoint(
                "DELETE",
                "/2010-04-01/Accounts/:AccountSid/Messages/:Sid.json",
                "Delete one message. Responds with no body.",
                204,
            ),
        ],
        detail_fields: vec![
            DetailField {
                label: "Message SID",
                pointer: "/payload/MessageSid",
                fallback: Some("—"),
            },
            DetailField {
                label: "Account SID",
                pointer: "/payload/AccountSid",
                fallback: Some("—"),
            },
            DetailField {
                label: "Messaging Service",
                pointer: "/payload/MessagingServiceSid",
                fallback: None,
            },
            DetailField {
                label: "Content SID",
                pointer: "/payload/ContentSid",
                fallback: None,
            },
            DetailField {
                label: "Media",
                pointer: "/payload/MediaUrl",
                fallback: None,
            },
        ],
        routes: super::twilio::routes::router,
    }
}

#[cfg(test)]
mod tests {
    use super::Provider;

    #[test]
    fn specs_line_up_with_their_providers() {
        for &provider in Provider::ALL {
            assert_eq!(provider.spec().id, provider.id());
            assert!(
                provider
                    .spec()
                    .send_path
                    .starts_with(provider.spec().base_path)
            );
        }
    }

    #[test]
    fn every_path_parameter_has_an_example() {
        for &provider in Provider::ALL {
            let spec = provider.spec();
            for endpoint in &spec.endpoints {
                for segment in endpoint.path.split('/') {
                    let Some(name) = segment.strip_prefix(':') else {
                        continue;
                    };
                    let name = name.trim_end_matches(".json");
                    assert!(
                        spec.path_params.iter().any(|param| param.name == name),
                        "{} is missing an example for :{name}",
                        spec.label
                    );
                }
            }
        }
    }
}
