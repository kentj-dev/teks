use std::sync::Arc;

use axum::{
    Json, Router,
    body::Bytes,
    extract::{Path, Query, RawQuery, State},
    routing::get,
};
use serde_json::Value;

use super::{
    requests::{AccountRequest, MessageListRequest, SendRequest},
    responses::{AccountResponse, SemaphoreMessageResponse, SenderNameResponse, UserResponse},
    service::{SemaphoreService, SendMode},
};
use crate::{AppState, error::AppError, providers::Provider};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/v4/messages", get(list_messages).post(send_messages))
        .route("/api/v4/messages/{id}", get(get_message))
        .route("/api/v4/priority", axum::routing::post(send_priority))
        .route("/api/v4/otp", axum::routing::post(send_otp))
        .route("/api/v4/account", get(account))
        .route("/api/v4/account/transactions", get(transactions))
        .route("/api/v4/account/sendernames", get(sender_names))
        .route("/api/v4/account/users", get(users))
}

async fn send_messages(
    State(state): State<Arc<AppState>>,
    RawQuery(query): RawQuery,
    body: Bytes,
) -> Result<Json<Vec<SemaphoreMessageResponse>>, AppError> {
    send(state, query, body, SendMode::Messages).await
}

async fn send_priority(
    State(state): State<Arc<AppState>>,
    RawQuery(query): RawQuery,
    body: Bytes,
) -> Result<Json<Vec<SemaphoreMessageResponse>>, AppError> {
    send(state, query, body, SendMode::Priority).await
}

async fn send_otp(
    State(state): State<Arc<AppState>>,
    RawQuery(query): RawQuery,
    body: Bytes,
) -> Result<Json<Vec<SemaphoreMessageResponse>>, AppError> {
    send(state, query, body, SendMode::Otp).await
}

async fn send(
    state: Arc<AppState>,
    query: Option<String>,
    body: Bytes,
    mode: SendMode,
) -> Result<Json<Vec<SemaphoreMessageResponse>>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    let request = SendRequest::from_query_and_body(query.as_deref(), &body)?;
    Ok(Json(
        SemaphoreService::default()
            .send(&state, request, mode)
            .await?,
    ))
}

async fn list_messages(
    State(state): State<Arc<AppState>>,
    Query(request): Query<MessageListRequest>,
) -> Result<Json<Vec<SemaphoreMessageResponse>>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    Ok(Json(
        SemaphoreService::default().list(&state, request).await?,
    ))
}

async fn get_message(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Query(request): Query<AccountRequest>,
) -> Result<Json<SemaphoreMessageResponse>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    Ok(Json(
        SemaphoreService::default().get(&state, request, id).await?,
    ))
}

async fn account(
    State(state): State<Arc<AppState>>,
    Query(request): Query<AccountRequest>,
) -> Result<Json<AccountResponse>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    Ok(Json(SemaphoreService::default().account(&request)?))
}

async fn sender_names(
    State(state): State<Arc<AppState>>,
    Query(request): Query<AccountRequest>,
) -> Result<Json<Vec<SenderNameResponse>>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    Ok(Json(SemaphoreService::default().sender_names(&request)?))
}

async fn users(
    State(state): State<Arc<AppState>>,
    Query(request): Query<AccountRequest>,
) -> Result<Json<Vec<UserResponse>>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    Ok(Json(SemaphoreService::default().users(&request)?))
}

async fn transactions(
    State(state): State<Arc<AppState>>,
    Query(request): Query<AccountRequest>,
) -> Result<Json<Vec<Value>>, AppError> {
    state.provider.require(Provider::Semaphore)?;
    request.require_api_key()?;
    let _ = request.pagination();
    // Semaphore documents this route without a definitive transaction schema. Verify the
    // exact wire shape against an authenticated response before adding simulated records.
    Ok(Json(Vec::new()))
}
