use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Map, Value};

use super::error::TwilioError;

/// Parameters of `POST /Messages.json`. Twilio only accepts form bodies, and helper libraries
/// repeat `MediaUrl` once per attachment, so the body is read as ordered pairs.
#[derive(Debug, Default)]
pub struct CreateMessageRequest {
    pub to: Option<String>,
    pub from: Option<String>,
    pub messaging_service_sid: Option<String>,
    pub body: Option<String>,
    pub content_sid: Option<String>,
    pub media_urls: Vec<String>,
    /// Every submitted parameter, kept as the inbox's raw request payload.
    pub params: Map<String, Value>,
}

impl CreateMessageRequest {
    pub fn from_form(body: &[u8]) -> Result<Self, TwilioError> {
        let pairs: Vec<(String, String)> = serde_urlencoded::from_bytes(body)
            .map_err(|_| TwilioError::bad_request(20001, "Malformed form request."))?;
        let mut request = Self::default();
        for (key, value) in pairs {
            let present = Some(value.trim().to_owned()).filter(|value| !value.is_empty());
            match key.as_str() {
                "To" => request.to = present,
                "From" => request.from = present,
                "MessagingServiceSid" => request.messaging_service_sid = present,
                "Body" => request.body = Some(value.clone()).filter(|body| !body.is_empty()),
                "ContentSid" => request.content_sid = present,
                "MediaUrl" => request.media_urls.extend(present),
                _ => {}
            }
            match request.params.get_mut(&key) {
                Some(Value::Array(values)) => values.push(Value::String(value)),
                Some(existing) => {
                    let first = existing.take();
                    *existing = Value::Array(vec![first, Value::String(value)]);
                }
                None if key == "MediaUrl" => {
                    request
                        .params
                        .insert(key, Value::Array(vec![Value::String(value)]));
                }
                None => {
                    request.params.insert(key, Value::String(value));
                }
            }
        }
        Ok(request)
    }
}

/// Query parameters of `GET /Messages.json`.
#[derive(Debug)]
pub struct ListMessagesRequest {
    pub to: Option<String>,
    pub from: Option<String>,
    pub date_sent: Option<DateFilter>,
    pub date_sent_before: Option<DateFilter>,
    pub date_sent_after: Option<DateFilter>,
    pub page: usize,
    pub page_size: usize,
}

impl ListMessagesRequest {
    pub fn from_query(query: Option<&str>) -> Result<Self, TwilioError> {
        let pairs: Vec<(String, String)> = serde_urlencoded::from_str(query.unwrap_or_default())
            .map_err(|_| TwilioError::bad_request(20001, "Malformed query parameters."))?;
        let mut request = Self {
            to: None,
            from: None,
            date_sent: None,
            date_sent_before: None,
            date_sent_after: None,
            page: 0,
            page_size: 50,
        };
        for (key, value) in pairs {
            let value = value.trim();
            match key.as_str() {
                "To" => request.to = Some(value.to_owned()),
                "From" => request.from = Some(value.to_owned()),
                "DateSent" => request.date_sent = Some(DateFilter::parse(&key, value)?),
                "DateSent<" => request.date_sent_before = Some(DateFilter::parse(&key, value)?),
                "DateSent>" => request.date_sent_after = Some(DateFilter::parse(&key, value)?),
                "Page" => request.page = parse_number(&key, value)?,
                "PageSize" => {
                    request.page_size = parse_number::<usize>(&key, value)?.clamp(1, 1000)
                }
                // Pages are addressed by `Page`; the token is accepted so SDK paging URIs work.
                _ => {}
            }
        }
        Ok(request)
    }

    /// Filters that must be carried into `first_page_uri`, `next_page_uri`, and friends.
    pub fn filter_pairs(&self) -> Vec<(&'static str, String)> {
        [
            ("To", self.to.clone()),
            ("From", self.from.clone()),
            ("DateSent", self.date_sent.map(DateFilter::to_param)),
            ("DateSent<", self.date_sent_before.map(DateFilter::to_param)),
            ("DateSent>", self.date_sent_after.map(DateFilter::to_param)),
        ]
        .into_iter()
        .filter_map(|(key, value)| value.map(|value| (key, value)))
        .collect()
    }
}

/// Helper libraries send either a date (`2026-09-25`) or an ISO 8601 date-time.
#[derive(Clone, Copy, Debug)]
pub enum DateFilter {
    Date(NaiveDate),
    DateTime(DateTime<Utc>),
}

impl DateFilter {
    fn parse(key: &str, value: &str) -> Result<Self, TwilioError> {
        if let Ok(date) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
            return Ok(Self::Date(date));
        }
        DateTime::parse_from_rfc3339(value)
            .map(|date| Self::DateTime(date.with_timezone(&Utc)))
            .map_err(|_| TwilioError::bad_request(20001, format!("Invalid {key}: {value}")))
    }

    fn to_param(self) -> String {
        match self {
            Self::Date(date) => date.format("%Y-%m-%d").to_string(),
            Self::DateTime(date) => date.to_rfc3339(),
        }
    }

    pub fn matches(self, sent: DateTime<Utc>, ordering: std::cmp::Ordering) -> bool {
        let actual = match self {
            Self::Date(date) => sent.date_naive().cmp(&date),
            Self::DateTime(date) => sent.cmp(&date),
        };
        actual == ordering || actual == std::cmp::Ordering::Equal
    }
}

fn parse_number<T: std::str::FromStr>(key: &str, value: &str) -> Result<T, TwilioError> {
    value
        .parse()
        .map_err(|_| TwilioError::bad_request(20001, format!("Invalid {key}: {value}")))
}
