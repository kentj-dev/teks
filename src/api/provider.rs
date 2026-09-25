use std::sync::Arc;

use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    providers::{Provider, ProviderSpec},
};

#[derive(Deserialize)]
pub struct UpdateProviderRequest {
    provider: Provider,
}

#[derive(Serialize)]
pub struct ProviderResponse {
    provider: Provider,
}

pub async fn get_provider(State(state): State<Arc<AppState>>) -> Json<ProviderResponse> {
    Json(ProviderResponse {
        provider: state.provider.current(),
    })
}

pub async fn update_provider(
    State(state): State<Arc<AppState>>,
    Json(request): Json<UpdateProviderRequest>,
) -> Json<ProviderResponse> {
    state.provider.set(request.provider);
    Json(ProviderResponse {
        provider: request.provider,
    })
}

pub async fn list_providers() -> Json<Vec<&'static ProviderSpec>> {
    Json(
        Provider::ALL
            .iter()
            .map(|provider| provider.spec())
            .collect(),
    )
}
