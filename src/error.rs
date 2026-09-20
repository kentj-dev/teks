use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Invalid listen address '{0}'.")]
    InvalidAddress(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("Malformed JSON request.")]
    MalformedJson,
    #[error("Message not found.")]
    NotFound,
    #[error("{0}")]
    ProviderMismatch(String),
    #[error(
        "Teks could not start.\n\nPort {port} is already in use.\n\nTry:\n\nteks --port {suggestion}"
    )]
    PortInUse { port: u16, suggestion: u16 },
    #[error("{0}")]
    Validation(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    success: bool,
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::MalformedJson => (StatusCode::BAD_REQUEST, self.to_string()),
            Self::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            Self::ProviderMismatch(_) => (StatusCode::CONFLICT, self.to_string()),
            Self::Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, self.to_string()),
            _ => {
                tracing::error!(error = %self, "request failed");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Teks could not process the request.".into(),
                )
            }
        };
        (
            status,
            Json(ErrorResponse {
                success: false,
                error: message,
            }),
        )
            .into_response()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Database(value.to_string())
    }
}

impl From<tokio::task::JoinError> for AppError {
    fn from(value: tokio::task::JoinError) -> Self {
        Self::Database(value.to_string())
    }
}
