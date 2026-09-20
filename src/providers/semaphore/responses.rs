use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct SemaphoreMessageResponse {
    pub message_id: i64,
    pub user_id: i64,
    pub user: String,
    pub account_id: i64,
    pub account: String,
    pub recipient: String,
    pub message: String,
    pub sender_name: String,
    pub network: String,
    pub status: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub source: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
pub struct AccountResponse {
    pub account_id: i64,
    pub account_name: String,
    pub status: String,
    pub credit_balance: i64,
}

#[derive(Clone, Debug, Serialize)]
pub struct SenderNameResponse {
    pub name: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct UserResponse {
    pub user_id: i64,
    pub email: String,
    pub role: String,
    pub status: String,
}
