use chrono::{DateTime, Utc};
use rusqlite::{OptionalExtension, params};
use serde::Serialize;
use uuid::Uuid;

use super::Database;
use crate::{error::AppError, providers::CapturedMessage};

#[derive(Clone, Debug, Serialize)]
pub struct Message {
    pub id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_message_id: Option<i64>,
    pub provider: String,
    #[serde(rename = "to")]
    pub recipient: String,
    #[serde(rename = "from")]
    pub sender: Option<String>,
    pub message: String,
    pub status: String,
    pub payload: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Database {
    pub async fn insert_message(&self, captured: CapturedMessage) -> Result<Message, AppError> {
        self.call(move |connection| {
            let message = Message {
                id: captured.id,
                provider_message_id: None,
                provider: captured.provider,
                recipient: captured.recipient,
                sender: captured.sender,
                message: captured.body,
                status: captured.status,
                payload: captured.payload,
                created_at: captured.created_at,
                updated_at: captured.created_at,
            };
            connection.execute(
                "INSERT INTO messages
                    (uuid, provider, recipient, sender, body, status, payload, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    message.id.to_string(),
                    message.provider,
                    message.recipient,
                    message.sender,
                    message.message,
                    message.status,
                    message.payload.to_string(),
                    message.created_at.to_rfc3339(),
                    message.updated_at.to_rfc3339(),
                ],
            )?;
            let mut message = message;
            if message.provider == "semaphore" {
                message.provider_message_id = Some(connection.last_insert_rowid());
            }
            Ok(message)
        })
        .await
    }

    pub async fn list_messages(&self) -> Result<Vec<Message>, AppError> {
        self.call(move |connection| {
            let mut statement = connection.prepare(
                "SELECT id, uuid, provider, recipient, sender, body, status, payload, created_at, updated_at
                 FROM messages ORDER BY created_at DESC, id DESC",
            )?;
            let rows = statement.query_map([], row_to_message)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
        })
        .await
    }

    pub async fn get_message(&self, id: Uuid) -> Result<Message, AppError> {
        self.call(move |connection| {
            connection
                .query_row(
                    "SELECT id, uuid, provider, recipient, sender, body, status, payload, created_at, updated_at
                     FROM messages WHERE uuid = ?1",
                    [id.to_string()],
                    row_to_message,
                )
                .optional()?
                .ok_or(AppError::NotFound)
        })
        .await
    }

    pub async fn list_messages_by_provider(
        &self,
        provider: &'static str,
    ) -> Result<Vec<Message>, AppError> {
        self.call(move |connection| {
            let mut statement = connection.prepare(
                "SELECT id, uuid, provider, recipient, sender, body, status, payload, created_at, updated_at
                 FROM messages WHERE provider = ?1 ORDER BY created_at DESC, id DESC",
            )?;
            let rows = statement.query_map([provider], row_to_message)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
        })
        .await
    }

    pub async fn get_message_by_provider_id(
        &self,
        provider: &'static str,
        provider_message_id: i64,
    ) -> Result<Message, AppError> {
        self.call(move |connection| {
            connection
                .query_row(
                    "SELECT id, uuid, provider, recipient, sender, body, status, payload, created_at, updated_at
                     FROM messages WHERE provider = ?1 AND id = ?2",
                    params![provider, provider_message_id],
                    row_to_message,
                )
                .optional()?
                .ok_or(AppError::NotFound)
        })
        .await
    }

    pub async fn delete_message(&self, id: Uuid) -> Result<(), AppError> {
        self.call(move |connection| {
            let changed =
                connection.execute("DELETE FROM messages WHERE uuid = ?1", [id.to_string()])?;
            if changed == 0 {
                return Err(AppError::NotFound);
            }
            Ok(())
        })
        .await
    }

    pub async fn clear_messages(&self) -> Result<usize, AppError> {
        self.call(move |connection| {
            connection
                .execute("DELETE FROM messages", [])
                .map_err(AppError::from)
        })
        .await
    }
}

fn row_to_message(row: &rusqlite::Row<'_>) -> rusqlite::Result<Message> {
    let database_id: i64 = row.get(0)?;
    let id: String = row.get(1)?;
    let provider: String = row.get(2)?;
    let payload: String = row.get(7)?;
    let created_at: String = row.get(8)?;
    let updated_at: String = row.get(9)?;

    Ok(Message {
        id: Uuid::parse_str(&id).map_err(conversion_error)?,
        provider_message_id: (provider == "semaphore").then_some(database_id),
        provider,
        recipient: row.get(3)?,
        sender: row.get(4)?,
        message: row.get(5)?,
        status: row.get(6)?,
        payload: serde_json::from_str(&payload).map_err(conversion_error)?,
        created_at: DateTime::parse_from_rfc3339(&created_at)
            .map_err(conversion_error)?
            .with_timezone(&Utc),
        updated_at: DateTime::parse_from_rfc3339(&updated_at)
            .map_err(conversion_error)?
            .with_timezone(&Utc),
    })
}

fn conversion_error(error: impl std::error::Error + Send + Sync + 'static) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(error))
}
