use std::path::PathBuf;

use clap::Parser;

use crate::providers::Provider;

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

    /// Provider whose API is enabled at startup.
    #[arg(long, value_enum, default_value_t)]
    pub provider: Provider,

    /// Shorthand for '--provider semaphore'.
    #[arg(long, hide = true, conflicts_with = "provider")]
    pub semaphore: bool,

    /// Override the application data directory (useful for development and tests).
    #[arg(long, hide = true, value_name = "PATH")]
    pub data_dir: Option<PathBuf>,
}

impl Cli {
    pub fn initial_provider(&self) -> Provider {
        if self.semaphore {
            Provider::Semaphore
        } else {
            self.provider
        }
    }
}

#[cfg(test)]
mod tests {
    use clap::Parser;

    use super::Cli;
    use crate::providers::Provider;

    fn provider(args: &[&str]) -> Provider {
        Cli::try_parse_from(args).unwrap().initial_provider()
    }

    #[test]
    fn rest_is_the_default_provider() {
        assert_eq!(provider(&["teks"]), Provider::Rest);
    }

    #[test]
    fn provider_flag_selects_any_registered_provider() {
        for &expected in Provider::ALL {
            assert_eq!(provider(&["teks", "--provider", expected.id()]), expected);
        }
    }

    #[test]
    fn semaphore_flag_is_kept_as_a_shorthand() {
        assert_eq!(provider(&["teks", "--semaphore"]), Provider::Semaphore);
    }
}
