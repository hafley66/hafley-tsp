#[path = "../hand/0_cli.rs"]
#[allow(dead_code)]
mod hand;

use clap::CommandFactory;
use clap::Parser;

const VERBS: [&str; 14] = ["fast", "slow", "scip", "graph", "cleave", "move", "rename", "query", "region", "watch", "diff", "ingest", "schema", "trail"];

fn table(cmd: clap::Command) -> String {
    let mut rows = Vec::new();
    rows.push(format!("root about={} after_help={} args_conflicts={}",
        cmd.get_about().map(|s| s.to_string()).unwrap_or_default(),
        cmd.get_after_help().map(|s| s.to_string()).unwrap_or_default(),
        cmd.is_args_conflicts_with_subcommands_set()));
    let mut root_args: Vec<String> = cmd.get_arguments()
        .filter(|a| !matches!(a.get_id().as_str(), "help" | "version"))
        .map(|a| format!("root {} {:?} {:?} {}",
            a.get_long().map(|l| format!("--{l}")).unwrap_or_else(|| format!("<{}>", a.get_id())),
            a.get_action(), a.get_value_names(), a.get_value_delimiter().map(|c| c.to_string()).unwrap_or_default()))
        .collect();
    root_args.sort();
    rows.extend(root_args);
    for verb in VERBS {
        let sub = cmd.find_subcommand(verb).unwrap_or_else(|| panic!("no subcommand {verb}"));
        rows.push(format!("{verb} after_help={}", sub.get_after_help().map(|s| s.to_string()).unwrap_or_default()));
        let mut groups: Vec<String> = sub.get_groups()
            .filter(|g| g.is_required_set())
            .map(|g| {
                let mut names: Vec<String> = g.get_args().map(|a| a.to_string()).collect();
                names.sort();
                format!("{verb} required_one_of={}", names.join(","))
            })
            .collect();
        groups.sort();
        rows.extend(groups);
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
                    "{verb:6} {flag:18} {ty:26} {:8} req={:5} def={:3} value={:?} delimiter={:?} | {help}",
                    format!("{:?}", a.get_action()),
                    a.is_required_set(),
                    defaults.join(","),
                    a.get_value_names(), a.get_value_delimiter(),
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

#[test]
fn generated_cli_acceptance_matches_handwritten() {
    const CASES: &[&[&str]] = &[
        &["ryi"],
        &["ryi", "src/a.rs"],
        &["ryi", "src/a.rs", "fast"],
        &["ryi", "--sqlite", "out.db", "--bench"],
        &["ryi", "fast", "--depth", "2"],
        &["ryi", "fast", "--entry", "src/a.rs", "--depth", "2"],
        &["ryi", "fast", "--pattern", "*.rs"],
        &["ryi", "fast", "--patterns", "*.rs"],
        &["ryi", "scip", "--scip-build"],
        &["ryi", "scip", "--scip-build", "--raw", "--root", "."],
        &["ryi", "graph"],
        &["ryi", "graph", "--callers", "Name"],
        &["ryi", "graph", "--callers", "Name", "--timeout", "0"],
        &["ryi", "cleave", "src/a.rs#X", "src/b.rs", "--list", "moves.tsv"],
        &["ryi", "watch", "--poll-ms", "0"],
        &["ryi", "watch", "--poll-ms", "1"],
        &["ryi", "ingest"],
        &["ryi", "ingest", "/dev/stdin"],
    ];
    fn results<P: Parser>(cases: &[&[&str]]) -> Vec<(String, String)> {
        cases.iter().map(|argv| {
            let result = match P::try_parse_from(argv.iter().copied()) {
                Ok(_) => "ok".to_string(),
                Err(error) => format!("{:?}", error.kind()),
            };
            (argv.join(" "), result)
        }).collect()
    }
    assert_eq!(results::<ryi_cli_parity::cli_auto::Ryi>(CASES), results::<hand::Ryi>(CASES));
}
