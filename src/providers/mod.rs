mod registry;
mod rest;
pub mod semaphore;
pub mod twilio;

use std::sync::{Arc, RwLock};

use chrono::{DateTime, Utc};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;

pub use registry::{Provider, ProviderSpec};
pub use rest::{RestIncomingRequest, RestProvider};

use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct ProviderSelection {
    current: Arc<RwLock<Provider>>,
}

impl ProviderSelection {
    pub fn new(provider: Provider) -> Self {
        Self {
            current: Arc::new(RwLock::new(provider)),
        }
    }

    pub fn current(&self) -> Provider {
        *self
            .current
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    pub fn set(&self, provider: Provider) {
        *self
            .current
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = provider;
    }

    pub fn require(&self, expected: Provider) -> Result<(), AppError> {
        let active = self.current();
        if active == expected {
            return Ok(());
        }

        let spec = active.spec();
        Err(AppError::ProviderMismatch(format!(
            "{label} is selected. Only {label} endpoints under '{base}' can be used. \
             Change the provider in the inbox or start Teks with '--provider {expected}'.",
            label = spec.label,
            base = spec.base_path,
            expected = expected.id(),
        )))
    }
}

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
