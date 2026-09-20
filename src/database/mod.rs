mod messages;

use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use directories::ProjectDirs;
use rusqlite::Connection;

use crate::error::AppError;

pub use messages::Message;

#[derive(Clone)]
pub struct Database {
    connection: Arc<Mutex<Connection>>,
}

impl Database {
    pub async fn open(data_dir_override: Option<&Path>) -> Result<Self, AppError> {
        let data_dir = match data_dir_override {
            Some(path) => path.to_path_buf(),
            None => ProjectDirs::from("dev", "Teks", "Teks")
                .map(|project| project.data_local_dir().to_path_buf())
                .unwrap_or_else(|| PathBuf::from(".teks")),
        };
        std::fs::create_dir_all(&data_dir)?;
        let database_path = data_dir.join("teks.db");

        let connection = tokio::task::spawn_blocking(move || -> Result<Connection, AppError> {
            let connection = Connection::open(database_path)?;
            connection.pragma_update(None, "journal_mode", "WAL")?;
            connection.pragma_update(None, "foreign_keys", "ON")?;
            connection.execute_batch(
                "CREATE TABLE IF NOT EXISTS messages (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid        TEXT NOT NULL UNIQUE,
                    provider    TEXT NOT NULL,
                    recipient   TEXT NOT NULL,
                    sender      TEXT,
                    body        TEXT NOT NULL,
                    status      TEXT NOT NULL,
                    payload     TEXT NOT NULL,
                    created_at  TEXT NOT NULL,
                    updated_at  TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_messages_recipient_created_at
                    ON messages(recipient, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_messages_created_at
                    ON messages(created_at DESC);",
            )?;
            Ok(connection)
        })
        .await??;

        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
        })
    }

    pub(crate) async fn call<T, F>(&self, operation: F) -> Result<T, AppError>
    where
        T: Send + 'static,
        F: FnOnce(&Connection) -> Result<T, AppError> + Send + 'static,
    {
        let connection = Arc::clone(&self.connection);
        tokio::task::spawn_blocking(move || {
            let connection = connection
                .lock()
                .map_err(|_| AppError::Database("database lock was poisoned".into()))?;
            operation(&connection)
        })
        .await?
    }
}
