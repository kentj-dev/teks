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

    /// Start with only the Semaphore-compatible API enabled.
    #[arg(long)]
    pub semaphore: bool,

    /// Override the application data directory (useful for development and tests).
    #[arg(long, hide = true, value_name = "PATH")]
    pub data_dir: Option<PathBuf>,
}

#[cfg(test)]
mod tests {
    use clap::Parser;

    use super::Cli;

    #[test]
    fn rest_is_the_default_provider() {
        assert!(!Cli::try_parse_from(["teks"]).unwrap().semaphore);
    }

    #[test]
    fn semaphore_flag_selects_semaphore() {
        assert!(
            Cli::try_parse_from(["teks", "--semaphore"])
                .unwrap()
                .semaphore
        );
    }
}
