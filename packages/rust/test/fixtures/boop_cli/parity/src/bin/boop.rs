use clap::Parser;

fn main() {
    // --help is handled by the generated clap parser before any operation runs.
    let _ = boop_cli_parity::cli_auto::Boop::parse();
}
