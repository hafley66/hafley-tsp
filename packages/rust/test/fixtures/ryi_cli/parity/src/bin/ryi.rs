use clap::Parser;

fn main() -> std::process::ExitCode {
    ryi_cli_parity::cli_auto::main(ryi_cli_parity::cli_auto::Ryi::parse())
}
