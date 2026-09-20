use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State, rejection::JsonRejection},
    http::StatusCode,
};
use serde::Serialize;
use uuid::Uuid;

use crate::{
    AppState,
    database::Message,
    error::AppError,
    providers::{Provider, RestIncomingRequest, RestProvider, SmsProviderAdapter},
};

#[derive(Serialize)]
pub struct CreateMessageResponse {
    success: bool,
    id: Uuid,
    status: &'static str,
    message: &'static str,
}

#[derive(Serialize)]
pub struct DeleteResponse {
    success: bool,
    deleted: usize,
}

pub async fn create_message(
    State(state): State<Arc<AppState>>,
    payload: Result<Json<serde_json::Value>, JsonRejection>,
) -> Result<(StatusCode, Json<CreateMessageResponse>), AppError> {
    state.provider.require(Provider::Rest)?;
    let Json(raw_payload) = payload.map_err(|_| AppError::MalformedJson)?;
    let request: RestIncomingRequest =
        serde_json::from_value(raw_payload.clone()).map_err(|_| AppError::MalformedJson)?;
    let mut captured = RestProvider
        .normalize(request)
        .map_err(|error| AppError::Validation(error.to_string()))?;
    captured.payload = raw_payload;
    let message = state.database.insert_message(captured).await?;
    state.events.publish(message.clone());

    Ok((
        StatusCode::CREATED,
        Json(CreateMessageResponse {
            success: true,
            id: message.id,
            status: "delivered",
            message: "Message captured by Teks",
        }),
    ))
}

pub async fn list_messages(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Message>>, AppError> {
    state.provider.require(Provider::Rest)?;
    inbox_list_messages(State(state)).await
}

pub async fn inbox_list_messages(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Message>>, AppError> {
    Ok(Json(state.database.list_messages().await?))
}

pub async fn get_message(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Message>, AppError> {
    state.provider.require(Provider::Rest)?;
    inbox_get_message(State(state), Path(id)).await
}

pub async fn inbox_get_message(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Message>, AppError> {
    Ok(Json(state.database.get_message(id).await?))
}

pub async fn delete_message(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<DeleteResponse>, AppError> {
    state.provider.require(Provider::Rest)?;
    inbox_delete_message(State(state), Path(id)).await
}

pub async fn inbox_delete_message(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<DeleteResponse>, AppError> {
    state.database.delete_message(id).await?;
    Ok(Json(DeleteResponse {
        success: true,
        deleted: 1,
    }))
}

pub async fn clear_messages(
    State(state): State<Arc<AppState>>,
) -> Result<Json<DeleteResponse>, AppError> {
    state.provider.require(Provider::Rest)?;
    inbox_clear_messages(State(state)).await
}

pub async fn inbox_clear_messages(
    State(state): State<Arc<AppState>>,
) -> Result<Json<DeleteResponse>, AppError> {
    let deleted = state.database.clear_messages().await?;
    Ok(Json(DeleteResponse {
        success: true,
        deleted,
    }))
}
