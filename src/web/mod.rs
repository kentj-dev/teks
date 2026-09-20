use std::sync::Arc;

use axum::{
    body::Body,
    extract::State,
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use rust_embed::RustEmbed;

use crate::AppState;

#[derive(RustEmbed)]
#[folder = "web/dist/"]
struct WebAssets;

pub async fn serve(State(_state): State<Arc<AppState>>, uri: Uri) -> Response {
    let requested = uri.path().trim_start_matches('/');
    if requested.starts_with("api/") {
        return (StatusCode::NOT_FOUND, "API endpoint not found").into_response();
    }

    let path = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };
    let asset = WebAssets::get(path).or_else(|| WebAssets::get("index.html"));

    match asset {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime.as_ref())
                .header(
                    header::CACHE_CONTROL,
                    if path == "index.html" {
                        "no-cache"
                    } else {
                        "public, max-age=31536000, immutable"
                    },
                )
                .body(Body::from(content.data))
                .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
        }
        None => (StatusCode::NOT_FOUND, "Teks frontend was not embedded").into_response(),
    }
}
