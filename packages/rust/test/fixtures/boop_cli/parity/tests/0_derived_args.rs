use boop_cli_parity::cli_auto::Boop;
use clap::{CommandFactory, Parser};

#[test]
fn record_values_repeat_and_split_only_the_first_equals() {
    let argv = ["boop", "job", "create", "--env", "TOKEN=a=b", "--env", "EMPTY=", "--env", "TOKEN=second"];
    let matches = Boop::command().try_get_matches_from(argv).unwrap();
    let args = matches.subcommand_matches("job").unwrap().subcommand_matches("create").unwrap();
    assert_eq!(
        args.get_many::<(String, String)>("env").unwrap().cloned().collect::<Vec<_>>(),
        vec![("TOKEN".into(), "a=b".into()), ("EMPTY".into(), "".into()), ("TOKEN".into(), "second".into())]
    );
    Boop::try_parse_from(argv).unwrap();
    Boop::try_parse_from(["boop", "job", "create"]).unwrap();
    for invalid in ["MISSING_EQUALS", "=empty_key"] {
        let error = Boop::try_parse_from(["boop", "job", "create", "--env", invalid]).unwrap_err();
        assert_eq!(error.kind(), clap::error::ErrorKind::ValueValidation);
        assert!(error.to_string().contains("expected KEY=VAL with a nonempty key"));
    }
}

#[test]
fn body_string_arrays_require_the_separator_and_forward_flags() {
    let argv = ["boop", "tui", "omp", "--", "--help", "--cwd", "other dir"];
    let matches = Boop::command().try_get_matches_from(argv).unwrap();
    assert_eq!(
        matches.subcommand_matches("tui").unwrap().get_many::<String>("args").unwrap().map(String::as_str).collect::<Vec<_>>(),
        vec!["--help", "--cwd", "other dir"]
    );
    Boop::try_parse_from(argv).unwrap();
    Boop::try_parse_from(["boop", "tui", "omp"]).unwrap();
    let error = Boop::try_parse_from(["boop", "tui", "omp", "extra"]).unwrap_err();
    assert_eq!(error.kind(), clap::error::ErrorKind::UnknownArgument);
}
