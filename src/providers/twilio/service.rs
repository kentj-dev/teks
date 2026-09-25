use std::{cmp::Ordering, collections::BTreeMap, sync::Arc};

use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

use super::{
    error::TwilioError,
    requests::{CreateMessageRequest, ListMessagesRequest},
    responses::{MessagePage, MessageResponse},
};
use crate::{
    AppState,
    database::Message,
    error::AppError,
    providers::{CapturedMessage, Provider},
};

const API_VERSION: &str = "2010-04-01";
const MAX_BODY_CHARS: usize = 1600;
const ACCOUNT_SID: &str = "AccountSid";
const MESSAGE_SID: &str = "MessageSid";

pub async fn create(
    state: &Arc<AppState>,
    account_sid: &str,
    request: CreateMessageRequest,
) -> Result<MessageResponse, TwilioError> {
    let to = request
        .to
        .ok_or_else(|| TwilioError::bad_request(21604, "A 'To' phone number is required."))?;
    if request.from.is_none() && request.messaging_service_sid.is_none() {
        return Err(TwilioError::bad_request(
            21603,
            "A 'From' phone number is required.",
        ));
    }
    let body = match (&request.body, &request.content_sid) {
        (Some(body), _) => body.clone(),
        (None, Some(content_sid)) => format!("[Content template {content_sid}]"),
        (None, None) if !request.media_urls.is_empty() => request.media_urls.join("\n"),
        (None, None) => {
            return Err(TwilioError::bad_request(21602, "Message body is required."));
        }
    };
    if body.chars().count() > MAX_BODY_CHARS {
        return Err(TwilioError::bad_request(
            21617,
            "The concatenated message body exceeds the 1600 character limit.",
        ));
    }

    let id = Uuid::new_v4();
    let mut payload = request.params;
    payload.insert(ACCOUNT_SID.into(), Value::String(account_sid.into()));
    payload.insert(MESSAGE_SID.into(), Value::String(message_sid(id)));
    let message = state
        .database
        .insert_message(CapturedMessage {
            id,
            provider: Provider::Twilio.id().into(),
            recipient: to,
            sender: request.from.clone().or(request.messaging_service_sid),
            body,
            // Teks has no carrier, so the stored message is already delivered.
            status: "delivered".into(),
            payload: Value::Object(payload),
            created_at: Utc::now(),
        })
        .await?;
    state.events.publish(message.clone());

    // The create response reflects the moment of submission, like Twilio's.
    let mut response = message_response(&message);
    response.status = if request.from.is_some() {
        "queued"
    } else {
        "accepted"
    }
    .into();
    response.date_sent = None;
    Ok(response)
}

pub async fn list(
    state: &Arc<AppState>,
    account_sid: &str,
    request: ListMessagesRequest,
) -> Result<MessagePage, TwilioError> {
    let messages: Vec<_> = state
        .database
        .list_messages_by_provider(Provider::Twilio.id())
        .await?
        .into_iter()
        .filter(|message| {
            payload_str(message, ACCOUNT_SID) == Some(account_sid)
                && request
                    .to
                    .as_deref()
                    .is_none_or(|to| message.recipient == to)
                && request
                    .from
                    .as_deref()
                    .is_none_or(|from| payload_str(message, "From") == Some(from))
                && request
                    .date_sent
                    .is_none_or(|date| date.matches(message.created_at, Ordering::Equal))
                && request
                    .date_sent_before
                    .is_none_or(|date| date.matches(message.created_at, Ordering::Less))
                && request
                    .date_sent_after
                    .is_none_or(|date| date.matches(message.created_at, Ordering::Greater))
        })
        .collect();

    let start = request.page.saturating_mul(request.page_size);
    let page: Vec<_> = messages
        .iter()
        .skip(start)
        .take(request.page_size)
        .map(message_response)
        .collect();
    let has_next = start.saturating_add(page.len()) < messages.len();
    let page_uri = |page: usize| {
        let mut params = request.filter_pairs();
        params.push(("PageSize", request.page_size.to_string()));
        params.push(("Page", page.to_string()));
        format!(
            "{}?{}",
            messages_uri(account_sid),
            serde_urlencoded::to_string(params).unwrap_or_default()
        )
    };

    Ok(MessagePage {
        end: start + page.len().saturating_sub(1),
        first_page_uri: page_uri(0),
        next_page_uri: has_next.then(|| page_uri(request.page + 1)),
        page: request.page,
        page_size: request.page_size,
        previous_page_uri: (request.page > 0).then(|| page_uri(request.page - 1)),
        start,
        uri: page_uri(request.page),
        messages: page,
    })
}

pub async fn fetch(
    state: &Arc<AppState>,
    account_sid: &str,
    sid: &str,
) -> Result<MessageResponse, TwilioError> {
    Ok(message_response(&find(state, account_sid, sid).await?))
}

pub async fn delete(
    state: &Arc<AppState>,
    account_sid: &str,
    sid: &str,
) -> Result<(), TwilioError> {
    let message = find(state, account_sid, sid).await?;
    state.database.delete_message(message.id).await?;
    Ok(())
}

async fn find(state: &Arc<AppState>, account_sid: &str, sid: &str) -> Result<Message, TwilioError> {
    let not_found = || TwilioError::not_found(&message_uri(account_sid, sid));
    let id = sid
        .strip_prefix("SM")
        .or_else(|| sid.strip_prefix("MM"))
        .and_then(|hex| Uuid::try_parse(hex).ok())
        .ok_or_else(not_found)?;
    match state.database.get_message(id).await {
        Ok(message)
            if message.provider == Provider::Twilio.id()
                && payload_str(&message, ACCOUNT_SID) == Some(account_sid) =>
        {
            Ok(message)
        }
        Ok(_) | Err(AppError::NotFound) => Err(not_found()),
        Err(error) => Err(error.into()),
    }
}

fn message_response(message: &Message) -> MessageResponse {
    let account_sid = payload_str(message, ACCOUNT_SID)
        .unwrap_or_default()
        .to_owned();
    let sid = message_sid(message.id);
    let uri = message_uri(&account_sid, &sid);
    let body = payload_str(message, "Body")
        .unwrap_or(&message.message)
        .to_owned();
    let num_media = match message.payload.get("MediaUrl") {
        Some(Value::Array(urls)) => urls.len(),
        _ => 0,
    };

    MessageResponse {
        num_segments: segments(&body).to_string(),
        body,
        date_created: rfc2822(message.created_at),
        date_sent: Some(rfc2822(message.created_at)),
        date_updated: rfc2822(message.updated_at),
        direction: "outbound-api",
        error_code: None,
        error_message: None,
        from: payload_str(message, "From").map(str::to_owned),
        messaging_service_sid: payload_str(message, "MessagingServiceSid").map(str::to_owned),
        num_media: num_media.to_string(),
        price: None,
        price_unit: "USD",
        status: message.status.clone(),
        subresource_uris: BTreeMap::from([
            ("media", uri.replace(".json", "/Media.json")),
            ("feedback", uri.replace(".json", "/Feedback.json")),
        ]),
        to: message.recipient.clone(),
        account_sid,
        api_version: API_VERSION,
        sid,
        uri,
    }
}

/// Twilio SIDs are `SM` plus 32 hex digits, which is exactly a simple-format UUID.
fn message_sid(id: Uuid) -> String {
    format!("SM{}", id.simple())
}

fn messages_uri(account_sid: &str) -> String {
    format!("/{API_VERSION}/Accounts/{account_sid}/Messages.json")
}

fn message_uri(account_sid: &str, sid: &str) -> String {
    format!("/{API_VERSION}/Accounts/{account_sid}/Messages/{sid}.json")
}

fn rfc2822(date: DateTime<Utc>) -> String {
    date.format("%a, %d %b %Y %H:%M:%S %z").to_string()
}

fn payload_str<'a>(message: &'a Message, field: &str) -> Option<&'a str> {
    message.payload.get(field).and_then(Value::as_str)
}

/// Segment count as Twilio bills it: GSM-7 bodies fit 160 characters (153 per part when
/// concatenated, extension characters take two), anything else is UCS-2 at 70 (67 per part).
fn segments(body: &str) -> usize {
    const GSM7_BASIC: &str = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    const GSM7_EXTENDED: &str = "^{}\\[~]|€\u{c}";

    let gsm7_units = body.chars().try_fold(0_usize, |units, character| {
        if GSM7_BASIC.contains(character) {
            Some(units + 1)
        } else if GSM7_EXTENDED.contains(character) {
            Some(units + 2)
        } else {
            None
        }
    });
    let (units, single, multi) = match gsm7_units {
        Some(units) => (units, 160, 153),
        None => (body.encode_utf16().count(), 70, 67),
    };
    if units <= single {
        1
    } else {
        units.div_ceil(multi)
    }
}

#[cfg(test)]
mod tests {
    use super::segments;

    #[test]
    fn counts_segments_like_twilio() {
        assert_eq!(segments(""), 1);
        assert_eq!(segments(&"a".repeat(160)), 1);
        assert_eq!(segments(&"a".repeat(161)), 2);
        assert_eq!(segments(&"€".repeat(80)), 1);
        assert_eq!(segments(&"€".repeat(81)), 2);
        assert_eq!(segments(&"é".repeat(160)), 1);
        assert_eq!(segments(&"ą".repeat(70)), 1);
        assert_eq!(segments(&"ą".repeat(71)), 2);
        assert_eq!(segments("Hi 👋"), 1);
    }
}
