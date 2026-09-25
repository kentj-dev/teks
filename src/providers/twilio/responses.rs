use std::collections::BTreeMap;

use serde::Serialize;

/// `api.v2010.account.message` from Twilio's OpenAPI spec.
#[derive(Clone, Debug, Serialize)]
pub struct MessageResponse {
    pub account_sid: String,
    pub api_version: &'static str,
    pub body: String,
    pub date_created: String,
    pub date_sent: Option<String>,
    pub date_updated: String,
    pub direction: &'static str,
    pub error_code: Option<i64>,
    pub error_message: Option<String>,
    pub from: Option<String>,
    pub messaging_service_sid: Option<String>,
    pub num_media: String,
    pub num_segments: String,
    pub price: Option<String>,
    pub price_unit: &'static str,
    pub sid: String,
    pub status: String,
    pub subresource_uris: BTreeMap<&'static str, String>,
    pub to: String,
    pub uri: String,
}

#[derive(Debug, Serialize)]
pub struct MessagePage {
    pub end: usize,
    pub first_page_uri: String,
    pub next_page_uri: Option<String>,
    pub page: usize,
    pub page_size: usize,
    pub previous_page_uri: Option<String>,
    pub start: usize,
    pub uri: String,
    pub messages: Vec<MessageResponse>,
}
