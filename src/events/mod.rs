use tokio::sync::{broadcast, watch};

use crate::database::Message;

#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<Message>,
    shutdown_sender: watch::Sender<bool>,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(128);
        let (shutdown_sender, _) = watch::channel(false);
        Self {
            sender,
            shutdown_sender,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Message> {
        self.sender.subscribe()
    }

    pub fn publish(&self, message: Message) {
        // Having no browser connected is normal, so a send error is intentionally ignored.
        let _ = self.sender.send(message);
    }

    pub fn subscribe_shutdown(&self) -> watch::Receiver<bool> {
        self.shutdown_sender.subscribe()
    }

    pub fn shutdown(&self) {
        let _ = self.shutdown_sender.send(true);
    }
}
