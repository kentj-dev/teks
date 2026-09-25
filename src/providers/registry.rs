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
    pub endpoints: Vec<EndpointDoc>,
    /// Extra inspector rows for this provider's messages.
    pub detail_fields: Vec<DetailField>,
    #[serde(skip)]
    pub routes: fn() -> Router<Arc<AppState>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointDoc {
    pub method: &'static str,
    pub path: &'static str,
    pub description: &'static str,
    pub payload_label: &'static str,
    pub payload: Value,
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
    payload_label: &'static str,
    payload: Value,
) -> EndpointDoc {
    EndpointDoc {
        method,
        path,
        description,
        payload_label,
        payload,
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
        endpoints: vec![
            endpoint(
                "GET",
                "/api/health",
                "Check whether Teks is running.",
                "Sample response",
                json!({ "status": "ok", "service": "Teks" }),
            ),
            endpoint(
                "POST",
                "/api/messages",
                "Capture an outgoing SMS message.",
                "Request body",
                json!({ "to": "09171234567", "from": "MyApp", "message": "Your OTP is 123456" }),
            ),
            endpoint(
                "GET",
                "/api/messages",
                "List messages, newest first.",
                "Sample response",
                json!([sample]),
            ),
            endpoint(
                "GET",
                "/api/messages/:uuid",
                "Retrieve one captured message.",
                "Sample response",
                sample.clone(),
            ),
            endpoint(
                "DELETE",
                "/api/messages/:uuid",
                "Delete one captured message.",
                "Sample response",
                json!({ "success": true, "deleted": 1 }),
            ),
            endpoint(
                "DELETE",
                "/api/messages",
                "Clear every captured message.",
                "Sample response",
                json!({ "success": true, "deleted": 12 }),
            ),
            endpoint(
                "GET",
                "/api/events",
                "Subscribe to live SSE updates.",
                "Sample event payload",
                json!({ "event": "new-message", "data": sample }),
            ),
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

    ProviderSpec {
        id: Provider::Semaphore.id(),
        label: "Semaphore",
        description: "Use Semaphore-compatible endpoints with your existing integration.",
        icon: "phone",
        base_path: "/api/v4",
        send_path: "/api/v4/messages",
        example: "curl --data \\\n  \"apikey=local&number=09171234567&message=Your OTP is 123456&sendername=MyApp\" \\\n  {endpoint}",
        endpoints: vec![
            endpoint(
                "POST",
                "/api/v4/messages",
                "Capture one or up to 1,000 messages.",
                "Form parameters",
                json!({ "apikey": "local", "number": "09171234567", "message": "Hello from Teks", "sendername": "MyApp" }),
            ),
            endpoint(
                "POST",
                "/api/v4/priority",
                "Capture a priority message.",
                "Form parameters",
                json!({ "apikey": "local", "number": "09171234567", "message": "Important message", "sendername": "MyApp" }),
            ),
            endpoint(
                "POST",
                "/api/v4/otp",
                "Capture an OTP message with an optional code.",
                "Form parameters",
                json!({ "apikey": "local", "number": "09171234567", "message": "Your OTP is {otp}", "code": "123456" }),
            ),
            endpoint(
                "GET",
                "/api/v4/messages",
                "List captured Semaphore messages.",
                "Sample response",
                json!([sample]),
            ),
            endpoint(
                "GET",
                "/api/v4/messages/:id",
                "Retrieve one message by numeric ID.",
                "Sample response",
                sample,
            ),
            endpoint(
                "GET",
                "/api/v4/account",
                "Retrieve the simulated local account.",
                "Sample response",
                json!({ "account_id": 1, "account_name": "Teks Local", "status": "Active", "credit_balance": 999999 }),
            ),
            endpoint(
                "GET",
                "/api/v4/account/transactions",
                "List simulated account transactions.",
                "Sample response",
                json!([]),
            ),
            endpoint(
                "GET",
                "/api/v4/account/sendernames",
                "List local sender names.",
                "Sample response",
                json!([{ "name": "Teks", "status": "Active", "created_at": "2026-01-01 00:00:00" }]),
            ),
            endpoint(
                "GET",
                "/api/v4/account/users",
                "List simulated account users.",
                "Sample response",
                json!([{ "user_id": 1, "email": "local@teks", "role": "Owner", "status": "Active" }]),
            ),
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
}
