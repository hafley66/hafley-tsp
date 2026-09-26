#[path = "../hand/0_cli.rs"]
#[allow(dead_code)]
mod hand;

use clap::CommandFactory;

const VERBS: [&str; 8] = ["fast", "slow", "scip", "graph", "query", "cleave", "move", "rename"];

fn table(cmd: clap::Command) -> String {
    let mut rows = Vec::new();
    for verb in VERBS {
        let sub = cmd.find_subcommand(verb).unwrap_or_else(|| panic!("no subcommand {verb}"));
        let mut args: Vec<String> = sub
            .get_arguments()
            .filter(|a| !matches!(a.get_id().as_str(), "help" | "version"))
            .map(|a| {
                let flag = a.get_long().map(|l| format!("--{l}")).unwrap_or_else(|| format!("<{}>", a.get_id()));
                let ty = format!("{:?}", a.get_value_parser().type_id());
                let defaults: Vec<String> =
                    a.get_default_values().iter().map(|v| v.to_string_lossy().into_owned()).collect();
                let help = a.get_help().map(|h| h.to_string()).unwrap_or_default();
                format!(
                    "{verb:6} {flag:18} {ty:26} {:8} req={:5} def={:3} | {help}",
                    format!("{:?}", a.get_action()),
                    a.is_required_set(),
                    defaults.join(","),
                )
            })
            .collect();
        args.sort();
        rows.extend(args);
    }
    rows.join("\n")
}

#[test]
fn generated_cli_matches_handwritten() {
    let generated = table(ryi_cli_parity::cli_auto::Ryi::command());
    println!("{generated}");
    assert_eq!(generated, table(hand::Ryi::command()));
}
