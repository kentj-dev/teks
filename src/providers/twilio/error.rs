use axum::{
    Json,
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde::Serialize;

use crate::error::AppError;

/// Errors in Twilio's wire format, so helper libraries raise their usual `RestException`.
#[derive(Debug)]
pub enum TwilioError {
    Api {
        status: StatusCode,
        code: u32,
        message: String,
    },
    App(AppError),
}

impl TwilioError {
    pub fn unauthenticated() -> Self {
        Self::api(StatusCode::UNAUTHORIZED, 20003, "Authenticate")
    }

    pub fn not_found(uri: &str) -> Self {
        Self::api(
            StatusCode::NOT_FOUND,
            20404,
            format!("The requested resource {uri} was not found"),
        )
    }

    pub fn bad_request(code: u32, message: impl Into<String>) -> Self {
        Self::api(StatusCode::BAD_REQUEST, code, message)
    }

    fn api(status: StatusCode, code: u32, message: impl Into<String>) -> Self {
        Self::Api {
            status,
            code,
            message: message.into(),
        }
    }
}

impl From<AppError> for TwilioError {
    fn from(value: AppError) -> Self {
        Self::App(value)
    }
}

#[derive(Serialize)]
struct ErrorBody {
    code: u32,
    message: String,
    more_info: String,
    status: u16,
}

impl IntoResponse for TwilioError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::Api {
                status,
                code,
                message,
            } => (status, code, message),
            Self::App(error) => return error.into_response(),
        };
        let mut response = (
            status,
            Json(ErrorBody {
                code,
                message,
                more_info: format!("https://www.twilio.com/docs/errors/{code}"),
                status: status.as_u16(),
            }),
        )
            .into_response();
        if status == StatusCode::UNAUTHORIZED {
            response.headers_mut().insert(
                header::WWW_AUTHENTICATE,
                HeaderValue::from_static("Basic realm=\"Twilio API\""),
            );
        }
        response
    }
}
