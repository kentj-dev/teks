use serde::Deserialize;

use crate::error::AppError;

#[derive(Clone, Debug, Default, Deserialize)]
pub struct SendRequest {
    pub apikey: Option<String>,
    pub number: Option<String>,
    pub message: Option<String>,
    pub sendername: Option<String>,
    pub code: Option<String>,
}

impl SendRequest {
    pub fn from_query_and_body(query: Option<&str>, body: &[u8]) -> Result<Self, AppError> {
        let query: Self = query
            .filter(|value| !value.is_empty())
            .map(serde_urlencoded::from_str)
            .transpose()
            .map_err(|_| AppError::Validation("Malformed Semaphore query parameters.".into()))?
            .unwrap_or_default();
        let submitted = if body.is_empty() {
            Self::default()
        } else if body
            .iter()
            .copied()
            .find(|byte| !byte.is_ascii_whitespace())
            == Some(b'{')
        {
            serde_json::from_slice(body)
                .map_err(|_| AppError::Validation("Malformed Semaphore JSON request.".into()))?
        } else {
            serde_urlencoded::from_bytes(body)
                .map_err(|_| AppError::Validation("Malformed Semaphore form request.".into()))?
        };

        Ok(Self {
            apikey: submitted.apikey.or(query.apikey),
            number: submitted.number.or(query.number),
            message: submitted.message.or(query.message),
            sendername: submitted.sendername.or(query.sendername),
            code: submitted.code.or(query.code),
        })
    }

    pub fn require_api_key(&self) -> Result<(), AppError> {
        require_api_key(self.apikey.as_deref())
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageListRequest {
    pub apikey: Option<String>,
    pub limit: Option<usize>,
    pub page: Option<usize>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub network: Option<String>,
    pub status: Option<String>,
}

impl MessageListRequest {
    pub fn require_api_key(&self) -> Result<(), AppError> {
        require_api_key(self.apikey.as_deref())
    }

    pub fn pagination(&self) -> (usize, usize) {
        (
            self.limit.unwrap_or(100).clamp(1, 1000),
            self.page.unwrap_or(1).max(1),
        )
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct AccountRequest {
    pub apikey: Option<String>,
    pub limit: Option<usize>,
    pub page: Option<usize>,
}

impl AccountRequest {
    pub fn require_api_key(&self) -> Result<(), AppError> {
        require_api_key(self.apikey.as_deref())
    }

    pub fn pagination(&self) -> (usize, usize) {
        (
            self.limit.unwrap_or(100).clamp(1, 1000),
            self.page.unwrap_or(1).max(1),
        )
    }
}

fn require_api_key(api_key: Option<&str>) -> Result<(), AppError> {
    if api_key.is_some_and(|value| !value.trim().is_empty()) {
        Ok(())
    } else {
        Err(AppError::Validation(
            "The 'apikey' parameter is required.".into(),
        ))
    }
}
