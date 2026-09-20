mod rest;

use chrono::{DateTime, Utc};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;

pub use rest::{RestIncomingRequest, RestProvider};

pub struct CapturedMessage {
    pub id: Uuid,
    pub provider: String,
    pub recipient: String,
    pub sender: Option<String>,
    pub body: String,
    pub status: String,
    pub payload: Value,
    pub created_at: DateTime<Utc>,
}

pub trait SmsProviderAdapter {
    type IncomingRequest;

    fn provider_name(&self) -> &'static str;
    fn normalize(&self, request: Self::IncomingRequest) -> Result<CapturedMessage, ProviderError>;
}

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("The 'to' field is required.")]
    MissingRecipient,
    #[error("The 'message' field is required.")]
    MissingMessage,
}
