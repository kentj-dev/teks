use tokio::sync::broadcast;

use crate::database::Message;

#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<Message>,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(128);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Message> {
        self.sender.subscribe()
    }

    pub fn publish(&self, message: Message) {
        // Having no browser connected is normal, so a send error is intentionally ignored.
        let _ = self.sender.send(message);
    }
}
