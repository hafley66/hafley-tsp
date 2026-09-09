#![allow(dead_code, unused_imports, non_snake_case)]
#[path = "../generated.rs"]
mod generated;
use generated::*;
use rusqlite::{Connection, OptionalExtension, params};
use std::{sync::{Arc, Barrier}, thread, time::Duration};

fn open(path: &str) -> rusqlite::Result<Connection> {
    let db = Connection::open(path)?;
    db.busy_timeout(Duration::from_secs(10))?;
    db.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(db)
}

#[test]
fn generated_writers_roundtrip_rollback_and_concurrency() -> rusqlite::Result<()> {
    let path = std::env::var("INTERN_TEST_DATABASE").unwrap();
    let mut db = open(&path)?;
    db.execute_batch(include_str!("../schema_auto.sql"))?;

    let id = upsert_Link(&mut db, "foo", "bar", Some("before"), Some("foo"), Some("foo"))?;
    assert_eq!(id, upsert_Link(&mut db, "foo", "bar", Some("after"), Some("foo"), None)?);
    assert_eq!(
        db.query_row("SELECT id, caller_id, callee_id, path_id, alias_id FROM Link", [], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?, row.get::<_, i64>(3)?, row.get::<_, Option<i64>>(4)?)))?,
        (1, 1, 2, 1, None),
    );
    assert_eq!(
        db.query_row("SELECT caller, callee, label, path, alias FROM Link_text", [], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?, row.get::<_, Option<String>>(4)?)))?,
        ("foo".into(), "bar".into(), "after".into(), "foo".into(), None),
    );
    assert_eq!(db.query_row("SELECT name FROM pragma_table_info('Link') ORDER BY cid", [], |row| row.get::<_, String>(0))?, "id");
    let columns = db.prepare("SELECT name FROM pragma_table_info('Link') ORDER BY cid")?
        .query_map([], |row| row.get::<_, String>(0))?.collect::<rusqlite::Result<Vec<_>>>()?;
    assert_eq!(columns, ["id", "caller_id", "callee_id", "label", "path_id", "alias_id"]);
    let readable = db.query_row("SELECT id, caller, callee, label, path, alias FROM Link_text", [], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?, row.get::<_, String>(4)?, row.get::<_, Option<String>>(5)?)))?;
    let normalized = format!("physical-columns={}\nreadable-link={}|{}|{}|{}|{}|{}", columns.join(","), readable.0, readable.1, readable.2, readable.3, readable.4, readable.5.unwrap_or_else(|| "NULL".into()));
    assert_eq!(normalized, include_str!("../intern_golden.txt").trim_end());

    let pair = upsert_Pair(&mut db, "foo", "bar")?;
    assert_eq!(pair, upsert_Pair(&mut db, "foo", "bar")?);
    upsert_Bare(&mut db, "foo")?;
    upsert_Names(&mut db, "foo", "transaction", "inserted", "keyword")?;
    db.execute("INSERT INTO scope (id, name) VALUES (1, 'one'), (2, 'two')", [])?;
    let scoped_one = upsert_Scoped(&mut db, 1, "foo")?;
    let scoped_two = upsert_Scoped(&mut db, 2, "foo")?;
    assert_ne!(scoped_one, scoped_two);
    assert_eq!(scoped_one, upsert_Scoped(&mut db, 1, "foo")?);
    assert_eq!(upsert_SelfValue(&mut db, "domain-self")?, 1);

    for value in ["", "ABC", "abc", "é", "e\u{301}", "a\0b", "'quoted'\ntext"] {
        let first = intern_Symbol(&db, value)?;
        assert_eq!(first, intern_Symbol(&db, value)?);
        assert_eq!(db.query_row("SELECT value FROM Symbol WHERE id=?1", [first], |row| row.get::<_, String>(0))?, value);
    }
    assert_eq!(db.query_row("SELECT count(*) FROM Symbol", [], |row| row.get::<_, i64>(0))?, 9);

    db.execute_batch("CREATE TRIGGER no_dictionary_update BEFORE UPDATE ON Symbol BEGIN SELECT RAISE(ABORT, 'dictionary updated'); END; CREATE TRIGGER reject_link BEFORE INSERT ON Link WHEN NEW.label = 'reject' BEGIN SELECT RAISE(ABORT, 'rejected'); END;")?;
    assert_eq!(intern_Symbol(&db, "foo")?, 1);
    assert!(upsert_Link(&mut db, "rolled-back", "bar", Some("reject"), None, None).is_err());
    assert_eq!(db.query_row("SELECT count(*) FROM Symbol WHERE value='rolled-back'", [], |row| row.get::<_, i64>(0))?, 0);
    assert!(db.execute("INSERT INTO Bare (value_id) VALUES (999999)", []).is_err());

    let mut outer = db.transaction()?;
    upsert_Bare(&mut outer, "outer-rollback")?;
    outer.rollback()?;
    assert_eq!(db.query_row("SELECT count(*) FROM Symbol WHERE value='outer-rollback'", [], |row| row.get::<_, i64>(0))?, 0);

    {
        let mut caller_savepoint = db.savepoint()?;
        upsert_Bare(&mut caller_savepoint, "savepoint-rollback")?;
        caller_savepoint.rollback()?;
    }
    assert_eq!(db.query_row("SELECT count(*) FROM Symbol WHERE value='savepoint-rollback'", [], |row| row.get::<_, i64>(0))?, 0);

    let barrier = Arc::new(Barrier::new(8));
    let mut tasks = Vec::new();
    for _ in 0..8 {
        let path = path.clone();
        let barrier = barrier.clone();
        tasks.push(thread::spawn(move || -> rusqlite::Result<i64> {
            let mut db = open(&path)?;
            barrier.wait();
            upsert_Pair(&mut db, "concurrent", "bar")
        }));
    }
    let ids = tasks.into_iter().map(|task| task.join().unwrap()).collect::<rusqlite::Result<Vec<_>>>()?;
    assert!(ids.iter().all(|id| *id == ids[0]));
    assert_eq!(db.query_row("SELECT count(*) FROM Symbol WHERE value='concurrent'", [], |row| row.get::<_, i64>(0))?, 1);
    assert_eq!(db.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))?, "ok");
    assert_eq!(db.prepare("PRAGMA foreign_key_check")?.query([])?.next()?.is_none(), true);
    drop(db);
    let reopened = open(&path)?;
    assert_eq!(intern_Symbol(&reopened, "foo")?, 1);
    Ok(())
}
