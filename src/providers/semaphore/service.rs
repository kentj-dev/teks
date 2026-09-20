use std::sync::Arc;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use uuid::Uuid;

use super::{
    requests::{AccountRequest, MessageListRequest, SendRequest},
    responses::{AccountResponse, SemaphoreMessageResponse, SenderNameResponse, UserResponse},
};
use crate::{AppState, database::Message, error::AppError, providers::CapturedMessage};

const PROVIDER: &str = "semaphore";
const REDACTED_API_KEY: &str = "********";
const DATE_FORMAT: &str = "%Y-%m-%d %H:%M:%S";

#[derive(Clone, Debug)]
pub struct SemaphoreConfig {
    pub account_id: i64,
    pub account_name: String,
    pub credit_balance: i64,
    pub user_id: i64,
    pub user_email: String,
    pub default_sender_name: String,
    pub network: String,
    pub sender_names: Vec<String>,
    #[allow(dead_code)]
    // Reserved for an opt-in simulator; local development is unlimited by default.
    pub simulate_rate_limits: bool,
}

impl Default for SemaphoreConfig {
    fn default() -> Self {
        Self {
            account_id: 1,
            account_name: "Teks Local".into(),
            credit_balance: 999_999,
            user_id: 1,
            user_email: "local@teks".into(),
            default_sender_name: "Teks".into(),
            network: "Unknown".into(),
            sender_names: vec!["Teks".into()],
            simulate_rate_limits: false,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub enum SendMode {
    Messages,
    Priority,
    Otp,
}

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum SemaphoreStatus {
    Queued,
    Pending,
    Sent,
    Failed,
    Refunded,
}

impl SemaphoreStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Queued => "Queued",
            Self::Pending => "Pending",
            Self::Sent => "Sent",
            Self::Failed => "Failed",
            Self::Refunded => "Refunded",
        }
    }
}

#[derive(Clone, Debug, Default)]
pub struct SemaphoreService {
    config: SemaphoreConfig,
}

impl SemaphoreService {
    pub async fn send(
        &self,
        state: &Arc<AppState>,
        request: SendRequest,
        mode: SendMode,
    ) -> Result<Vec<SemaphoreMessageResponse>, AppError> {
        request.require_api_key()?;
        let recipients = recipients(request.number.as_deref())?;
        let requested_message = required_value(request.message.as_deref(), "message")?;
        let sender = request
            .sendername
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(&self.config.default_sender_name)
            .to_owned();
        let otp = if matches!(mode, SendMode::Otp) {
            Some(otp_code(request.code.as_deref())?)
        } else {
            None
        };
        let body = otp
            .as_ref()
            .map(|(text, _)| apply_otp(requested_message, text))
            .unwrap_or_else(|| requested_message.to_owned());
        let message_type = match mode {
            SendMode::Priority => "Priority",
            SendMode::Messages | SendMode::Otp if recipients.len() > 1 => "Bulk",
            SendMode::Messages | SendMode::Otp => "Single",
        };

        let mut responses = Vec::with_capacity(recipients.len());
        for recipient in recipients {
            let mut payload = Map::from_iter([
                ("apikey".into(), Value::String(REDACTED_API_KEY.into())),
                ("number".into(), Value::String(recipient.clone())),
                (
                    "message".into(),
                    Value::String(requested_message.to_owned()),
                ),
                ("sendername".into(), Value::String(sender.clone())),
                ("type".into(), Value::String(message_type.into())),
                ("network".into(), Value::String(self.config.network.clone())),
            ]);
            if let Some((text, numeric)) = &otp {
                payload.insert("code".into(), json!(numeric));
                payload.insert("code_text".into(), json!(text));
            }

            let captured = CapturedMessage {
                id: Uuid::new_v4(),
                provider: PROVIDER.into(),
                recipient,
                sender: Some(sender.clone()),
                body: body.clone(),
                status: SemaphoreStatus::Sent.as_str().into(),
                payload: Value::Object(payload),
                created_at: chrono::Utc::now(),
            };
            let message = state.database.insert_message(captured).await?;
            state.events.publish(message.clone());
            responses.push(self.message_response(&message));
        }
        Ok(responses)
    }

    pub async fn list(
        &self,
        state: &Arc<AppState>,
        request: MessageListRequest,
    ) -> Result<Vec<SemaphoreMessageResponse>, AppError> {
        request.require_api_key()?;
        let start_date = parse_date(request.start_date.as_deref(), "startDate")?;
        let end_date = parse_date(request.end_date.as_deref(), "endDate")?;
        if start_date
            .zip(end_date)
            .is_some_and(|(start, end)| start > end)
        {
            return Err(AppError::Validation(
                "The 'startDate' parameter must not be after 'endDate'.".into(),
            ));
        }
        let (limit, page) = request.pagination();
        let offset = page.saturating_sub(1).saturating_mul(limit);
        let messages = state.database.list_messages_by_provider(PROVIDER).await?;

        Ok(messages
            .into_iter()
            .filter(|message| {
                let date = message.created_at.date_naive();
                start_date.is_none_or(|start| date >= start)
                    && end_date.is_none_or(|end| date <= end)
                    && request
                        .status
                        .as_deref()
                        .is_none_or(|status| message.status.eq_ignore_ascii_case(status.trim()))
                    && request.network.as_deref().is_none_or(|network| {
                        self.network(message).eq_ignore_ascii_case(network.trim())
                    })
            })
            .skip(offset)
            .take(limit)
            .map(|message| self.message_response(&message))
            .collect())
    }

    pub async fn get(
        &self,
        state: &Arc<AppState>,
        request: AccountRequest,
        id: i64,
    ) -> Result<SemaphoreMessageResponse, AppError> {
        request.require_api_key()?;
        let message = state
            .database
            .get_message_by_provider_id(PROVIDER, id)
            .await?;
        Ok(self.message_response(&message))
    }

    pub fn account(&self, request: &AccountRequest) -> Result<AccountResponse, AppError> {
        request.require_api_key()?;
        Ok(AccountResponse {
            account_id: self.config.account_id,
            account_name: self.config.account_name.clone(),
            status: "Active".into(),
            credit_balance: self.config.credit_balance,
        })
    }

    pub fn sender_names(
        &self,
        request: &AccountRequest,
    ) -> Result<Vec<SenderNameResponse>, AppError> {
        request.require_api_key()?;
        let (limit, page) = request.pagination();
        Ok(self
            .config
            .sender_names
            .iter()
            .skip(page.saturating_sub(1).saturating_mul(limit))
            .take(limit)
            .map(|name| SenderNameResponse {
                name: name.clone(),
                status: "Active".into(),
                created_at: "2026-01-01 00:00:00".into(),
            })
            .collect())
    }

    pub fn users(&self, request: &AccountRequest) -> Result<Vec<UserResponse>, AppError> {
        request.require_api_key()?;
        let (limit, page) = request.pagination();
        let users = [UserResponse {
            user_id: self.config.user_id,
            email: self.config.user_email.clone(),
            role: "Owner".into(),
            status: "Active".into(),
        }];
        Ok(users
            .into_iter()
            .skip(page.saturating_sub(1).saturating_mul(limit))
            .take(limit)
            .collect())
    }

    fn message_response(&self, message: &Message) -> SemaphoreMessageResponse {
        SemaphoreMessageResponse {
            message_id: message.provider_message_id.unwrap_or_default(),
            user_id: self.config.user_id,
            user: self.config.user_email.clone(),
            account_id: self.config.account_id,
            account: self.config.account_name.clone(),
            recipient: message.recipient.clone(),
            message: message.message.clone(),
            sender_name: message
                .sender
                .clone()
                .unwrap_or_else(|| self.config.default_sender_name.clone()),
            network: self.network(message).to_owned(),
            status: message.status.clone(),
            message_type: payload_string(message, "type")
                .unwrap_or("Single")
                .to_owned(),
            source: "Api".into(),
            created_at: message.created_at.format(DATE_FORMAT).to_string(),
            updated_at: message.updated_at.format(DATE_FORMAT).to_string(),
            code: message
                .payload
                .get("code")
                .and_then(Value::as_u64)
                .and_then(|value| u32::try_from(value).ok()),
        }
    }

    fn network<'a>(&'a self, message: &'a Message) -> &'a str {
        payload_string(message, "network").unwrap_or(&self.config.network)
    }
}

fn payload_string<'a>(message: &'a Message, field: &str) -> Option<&'a str> {
    message.payload.get(field).and_then(Value::as_str)
}

fn required_value<'a>(value: Option<&'a str>, field: &str) -> Result<&'a str, AppError> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::Validation(format!("The '{field}' parameter is required.")))
}

fn recipients(value: Option<&str>) -> Result<Vec<String>, AppError> {
    let value = required_value(value, "number")?;
    let recipients: Vec<_> = value
        .split(',')
        .map(str::trim)
        .filter(|recipient| !recipient.is_empty())
        .map(str::to_owned)
        .collect();
    if recipients.is_empty() {
        return Err(AppError::Validation(
            "The 'number' parameter is required.".into(),
        ));
    }
    if recipients.len() > 1000 {
        return Err(AppError::Validation(
            "The 'number' parameter supports at most 1000 recipients.".into(),
        ));
    }
    Ok(recipients)
}

fn otp_code(provided: Option<&str>) -> Result<(String, u32), AppError> {
    if let Some(provided) = provided.map(str::trim).filter(|value| !value.is_empty()) {
        if !provided.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err(AppError::Validation(
                "The 'code' parameter must be numeric.".into(),
            ));
        }
        let numeric = provided
            .parse()
            .map_err(|_| AppError::Validation("The 'code' parameter is too large.".into()))?;
        return Ok((provided.to_owned(), numeric));
    }

    let upper_bound = u32::MAX - (u32::MAX % 900_000);
    loop {
        let mut bytes = [0_u8; 4];
        getrandom::fill(&mut bytes)
            .map_err(|_| AppError::Database("secure random generator unavailable".into()))?;
        let sample = u32::from_ne_bytes(bytes);
        if sample < upper_bound {
            let numeric = 100_000 + sample % 900_000;
            return Ok((numeric.to_string(), numeric));
        }
    }
}

fn apply_otp(message: &str, code: &str) -> String {
    if message.contains("{otp}") {
        message.replace("{otp}", code)
    } else {
        format!("{message} Your One Time Password is {code}")
    }
}

fn parse_date(value: Option<&str>, field: &str) -> Result<Option<NaiveDate>, AppError> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| {
            NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
                AppError::Validation(format!("The '{field}' parameter must use YYYY-MM-DD."))
            })
        })
        .transpose()
}
