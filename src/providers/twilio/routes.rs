use std::sync::Arc;

use axum::{
    Json, Router,
    body::Bytes,
    extract::{Path, RawQuery, State},
    http::{HeaderMap, StatusCode, header},
    routing::get,
};

use super::{
    error::TwilioError,
    requests::{CreateMessageRequest, ListMessagesRequest},
    responses::{MessagePage, MessageResponse},
    service,
};
use crate::{AppState, providers::Provider};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/2010-04-01/Accounts/{account_sid}/Messages.json",
            get(list_messages).post(create_message),
        )
        // `{sid}` captures "SM….json"; the extension is stripped in the handlers.
        .route(
            "/2010-04-01/Accounts/{account_sid}/Messages/{sid}",
            get(fetch_message).delete(delete_message),
        )
}

async fn create_message(
    State(state): State<Arc<AppState>>,
    Path(account_sid): Path<String>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<(StatusCode, Json<MessageResponse>), TwilioError> {
    authorize(&state, &headers)?;
    let request = CreateMessageRequest::from_form(&body)?;
    let message = service::create(&state, &account_sid, request).await?;
    Ok((StatusCode::CREATED, Json(message)))
}

async fn list_messages(
    State(state): State<Arc<AppState>>,
    Path(account_sid): Path<String>,
    headers: HeaderMap,
    RawQuery(query): RawQuery,
) -> Result<Json<MessagePage>, TwilioError> {
    authorize(&state, &headers)?;
    let request = ListMessagesRequest::from_query(query.as_deref())?;
    Ok(Json(service::list(&state, &account_sid, request).await?))
}

async fn fetch_message(
    State(state): State<Arc<AppState>>,
    Path((account_sid, sid)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<MessageResponse>, TwilioError> {
    authorize(&state, &headers)?;
    let sid = strip_json(&account_sid, &sid)?;
    Ok(Json(service::fetch(&state, &account_sid, sid).await?))
}

async fn delete_message(
    State(state): State<Arc<AppState>>,
    Path((account_sid, sid)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<StatusCode, TwilioError> {
    authorize(&state, &headers)?;
    let sid = strip_json(&account_sid, &sid)?;
    service::delete(&state, &account_sid, sid).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Twilio requires HTTP Basic auth. Any credentials are accepted locally (Account SID + Auth
/// Token or an API key pair); they are never stored.
fn authorize(state: &AppState, headers: &HeaderMap) -> Result<(), TwilioError> {
    state.provider.require(Provider::Twilio)?;
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split_once(' '))
        .filter(|(scheme, credentials)| {
            scheme.eq_ignore_ascii_case("basic") && !credentials.trim().is_empty()
        })
        .map(|_| ())
        .ok_or_else(TwilioError::unauthenticated)
}

fn strip_json<'a>(account_sid: &str, sid: &'a str) -> Result<&'a str, TwilioError> {
    sid.strip_suffix(".json").ok_or_else(|| {
        TwilioError::not_found(&format!(
            "/2010-04-01/Accounts/{account_sid}/Messages/{sid}"
        ))
    })
}
