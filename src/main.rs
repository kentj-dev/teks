mod api;
mod cli;
mod database;
mod error;
mod events;
mod providers;
mod web;

use std::{net::SocketAddr, sync::Arc, time::Duration};

use clap::Parser;
use cli::Cli;
use database::Database;
use error::AppError;
use events::EventBus;
use tokio::net::TcpListener;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
pub struct AppState {
    pub database: Database,
    pub events: EventBus,
}

#[tokio::main]
async fn main() {
    if let Err(error) = run().await {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), AppError> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "teks=warn".into()))
        .with_target(false)
        .compact()
        .init();

    let cli = Cli::parse();
    let address: SocketAddr = format!("{}:{}", cli.host, cli.port)
        .parse()
        .map_err(|_| AppError::InvalidAddress(format!("{}:{}", cli.host, cli.port)))?;

    let database = Database::open(cli.data_dir.as_deref()).await?;
    let state = Arc::new(AppState {
        database,
        events: EventBus::new(),
    });
    let app = api::router(state);

    let listener = TcpListener::bind(address).await.map_err(|source| {
        if source.kind() == std::io::ErrorKind::AddrInUse {
            AppError::PortInUse {
                port: cli.port,
                suggestion: cli.port.saturating_add(1),
            }
        } else {
            AppError::Io(source)
        }
    })?;

    let base_url = format!("http://{address}");
    println!(
        "Teks {}\n\n✓ SMS gateway ready\n✓ Database ready\n\nInbox     {base_url}\nREST API  {base_url}/api/messages\n\nPress Ctrl+C to stop.",
        env!("CARGO_PKG_VERSION")
    );

    if !cli.no_open {
        let url = base_url.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(250)).await;
            if let Err(error) = open::that(&url) {
                tracing::warn!(%error, "Could not open the browser");
            }
        });
    }

    info!(%address, "server started");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(AppError::Io)?;
    info!("server stopped");
    Ok(())
}

async fn shutdown_signal() {
    if let Err(error) = tokio::signal::ctrl_c().await {
        error!(%error, "failed to install Ctrl+C handler");
    }
}
