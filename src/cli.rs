use std::path::PathBuf;

use clap::Parser;

#[derive(Debug, Parser)]
#[command(name = "teks", version, about = "Local SMS testing for developers.")]
pub struct Cli {
    /// Address on which Teks listens.
    #[arg(long, default_value = "127.0.0.1")]
    pub host: String,

    /// Port on which Teks listens.
    #[arg(long, default_value_t = 8026)]
    pub port: u16,

    /// Do not open the inbox in the default browser.
    #[arg(long)]
    pub no_open: bool,

    /// Override the application data directory (useful for development and tests).
    #[arg(long, hide = true, value_name = "PATH")]
    pub data_dir: Option<PathBuf>,
}
