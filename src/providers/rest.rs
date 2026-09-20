use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{CapturedMessage, ProviderError, SmsProviderAdapter};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RestIncomingRequest {
    pub to: Option<String>,
    #[serde(rename = "from")]
    pub sender: Option<String>,
    pub message: Option<String>,
}

pub struct RestProvider;

impl SmsProviderAdapter for RestProvider {
    type IncomingRequest = RestIncomingRequest;

    fn provider_name(&self) -> &'static str {
        "rest"
    }

    fn normalize(&self, request: Self::IncomingRequest) -> Result<CapturedMessage, ProviderError> {
        let recipient = request
            .to
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or(ProviderError::MissingRecipient)?
            .to_owned();
        let body = request
            .message
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or(ProviderError::MissingMessage)?
            .to_owned();
        let payload = serde_json::to_value(&request).unwrap_or(serde_json::Value::Null);

        Ok(CapturedMessage {
            id: Uuid::new_v4(),
            provider: self.provider_name().into(),
            recipient,
            sender: request.sender,
            body,
            status: "delivered".into(),
            payload,
            created_at: Utc::now(),
        })
    }
}
