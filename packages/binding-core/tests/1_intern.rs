#![allow(dead_code, unused_imports, non_snake_case)]
#[path = "../generated.rs"]
mod generated;
use generated::*;
use sqlx::{Connection, Row, sqlite::{SqliteConnection, SqliteConnectOptions}};
use std::{str::FromStr, time::Duration};

#[tokio::test]
async fn generated_writers_roundtrip_rollback_and_concurrency() -> anyhow::Result<()> {
    let path = std::env::var("INTERN_TEST_DATABASE")?;
    let options = SqliteConnectOptions::from_str(&format!("sqlite://{path}"))?
        .create_if_missing(true).foreign_keys(true).busy_timeout(Duration::from_secs(10));
    let mut db = SqliteConnection::connect_with(&options).await?;
    sqlx::raw_sql(include_str!("../schema_auto.sql")).execute(&mut db).await?;
    let id = upsert_Link(&mut db, "foo", "bar", Some("before"), Some("foo"), Some("foo")).await?;
    assert_eq!(id, upsert_Link(&mut db, "foo", "bar", Some("after"), Some("foo"), None).await?);
    let row = sqlx::query("SELECT id, caller_id, callee_id, path_id, alias_id FROM Link").fetch_one(&mut db).await?;
    assert_eq!((row.get::<i64,_>(0), row.get::<i64,_>(1), row.get::<i64,_>(2), row.get::<i64,_>(3), row.get::<Option<i64>,_>(4)), (1, 1, 2, 1, None));
    let row = sqlx::query("SELECT caller, callee, label, path, alias FROM Link_text").fetch_one(&mut db).await?;
    assert_eq!((row.get::<String,_>(0), row.get::<String,_>(1), row.get::<String,_>(2), row.get::<String,_>(3), row.get::<Option<String>,_>(4)), ("foo".into(), "bar".into(), "after".into(), "foo".into(), None));
    let pair = upsert_Pair(&mut db, "foo", "bar").await?;
    assert_eq!(pair, upsert_Pair(&mut db, "foo", "bar").await?);
    upsert_Bare(&mut db, "foo").await?;
    upsert_Names(&mut db, "foo", "transaction", "inserted", "keyword").await?;
    sqlx::query("INSERT INTO scope (id, name) VALUES (1, 'one'), (2, 'two')").execute(&mut db).await?;
    let scoped_one = upsert_Scoped(&mut db, 1, "foo").await?;
    let scoped_two = upsert_Scoped(&mut db, 2, "foo").await?;
    assert_ne!(scoped_one, scoped_two);
    assert_eq!(scoped_one, upsert_Scoped(&mut db, 1, "foo").await?);
    for value in ["", "ABC", "abc", "é", "e\u{301}", "a\0b", "'quoted'\ntext"] {
        let first = intern_Symbol(&mut db, value).await?;
        assert_eq!(first, intern_Symbol(&mut db, value).await?);
        assert_eq!(sqlx::query_scalar::<_,String>("SELECT value FROM Symbol WHERE id=?").bind(first).fetch_one(&mut db).await?, value);
    }
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM Symbol").fetch_one(&mut db).await?, 9);

    // Intern hits must not cause dictionary UPDATE triggers (important for IVM).
    sqlx::raw_sql("CREATE TRIGGER no_dictionary_update BEFORE UPDATE ON Symbol BEGIN SELECT RAISE(ABORT, 'dictionary updated'); END; CREATE TRIGGER reject_link BEFORE INSERT ON Link WHEN NEW.label = 'reject' BEGIN SELECT RAISE(ABORT, 'rejected'); END;").execute(&mut db).await?;
    assert_eq!(intern_Symbol(&mut db, "foo").await?, 1);
    assert!(upsert_Link(&mut db, "rolled-back", "bar", Some("reject"), None, None).await.is_err());
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM Symbol WHERE value='rolled-back'").fetch_one(&mut db).await?, 0);
    assert!(sqlx::query("INSERT INTO Bare (value_id) VALUES (999999)").execute(&mut db).await.is_err());

    // Nested transaction is a savepoint; the caller still owns publication.
    let mut outer = db.begin().await?;
    upsert_Bare(&mut outer, "outer-rollback").await?;
    outer.rollback().await?;
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM Symbol WHERE value='outer-rollback'").fetch_one(&mut db).await?, 0);

    let mut tasks = Vec::new();
    for _ in 0..8 {
        let options = options.clone();
        tasks.push(tokio::spawn(async move {
            let mut db = SqliteConnection::connect_with(&options).await?;
            upsert_Pair(&mut db, "concurrent", "bar").await
        }));
    }
    let mut ids = Vec::new();
    for task in tasks { ids.push(task.await??); }
    assert!(ids.iter().all(|id| *id == ids[0]));
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM Symbol WHERE value='concurrent'").fetch_one(&mut db).await?, 1);
    assert_eq!(sqlx::query_scalar::<_,String>("PRAGMA integrity_check").fetch_one(&mut db).await?, "ok");
    assert_eq!(sqlx::query("PRAGMA foreign_key_check").fetch_all(&mut db).await?.len(), 0);
    db.close().await?;
    let mut reopened = SqliteConnection::connect_with(&options).await?;
    assert_eq!(intern_Symbol(&mut reopened, "foo").await?, 1);
    Ok(())
}
