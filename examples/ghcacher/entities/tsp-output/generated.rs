// alloy-imports-start
use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::SqliteConnection;




// alloy-imports-end
// alloy-row-structs-start
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
  pub id: i64,
  pub repo_id: i64,
  pub name: String,
  pub sha: Option<String>,
  pub behind_default: Option<i64>,
  pub ahead_default: Option<i64>,
  pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repo {
  pub id: i64,
  pub owner: String,
  pub name: String,
  pub default_branch: String,
  pub gh_node_id: Option<String>,
  pub updated_at: Option<String>,
}
// alloy-row-structs-end
// alloy-extraction-structs-start
pub struct BranchFields {
  pub name: String,
  pub sha: Option<String>,
  pub behind_default: Option<i64>,
  pub ahead_default: Option<i64>,
  pub updated_at: Option<String>,
}

pub struct RepoFields {
  pub owner: String,
  pub name: String,
  pub default_branch: String,
  pub gh_node_id: Option<String>,
  pub updated_at: Option<String>,
}


// alloy-extraction-structs-end
// alloy-upsert-fns-start
pub async fn upsert_branch(
    conn: &mut SqliteConnection,
    repo_id: i64,
    name: &str,
    sha: Option<&str>,
    behind_default: Option<i64>,
    ahead_default: Option<i64>,
    updated_at: Option<&str>,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO branch
         (repo_id, name, sha, behind_default, ahead_default, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(repo_id, name) DO UPDATE SET
             sha = excluded.sha,
             behind_default = excluded.behind_default,
             ahead_default = excluded.ahead_default,
             updated_at = excluded.updated_at
         RETURNING id"
    )
    .bind(repo_id)
    .bind(name)
    .bind(sha)
    .bind(behind_default)
    .bind(ahead_default)
    .bind(updated_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_repo(
    conn: &mut SqliteConnection,
    owner: &str,
    name: &str,
    default_branch: &str,
    gh_node_id: Option<&str>,
    updated_at: Option<&str>,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO repo
         (owner, name, default_branch, gh_node_id, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(owner, name) DO UPDATE SET
             default_branch = excluded.default_branch,
             gh_node_id = excluded.gh_node_id,
             updated_at = excluded.updated_at
         RETURNING id"
    )
    .bind(owner)
    .bind(name)
    .bind(default_branch)
    .bind(gh_node_id)
    .bind(updated_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}
// alloy-upsert-fns-end
// alloy-extract-fns-start
/// Extract Branch fields from a GhBranch JSON value.
pub fn extract_branch(src: &serde_json::Value) -> BranchFields {
    let name = src["name"].as_str().unwrap_or("").to_owned();
    let sha = src["commit"].as_str().map(|s| s.to_owned());
    BranchFields {
        name,
        sha,
    }
}

/// Extract Repo fields from a GhRepo JSON value.
pub fn extract_repo(src: &serde_json::Value) -> RepoFields {
    let owner = src["owner"]["login"].as_str().unwrap_or("").to_owned();
    let name = src["name"].as_str().unwrap_or("").to_owned();
    let default_branch = src["defaultBranchRef"]["name"].as_str().unwrap_or("").to_owned();
    RepoFields {
        owner,
        name,
        default_branch,
    }
}


// alloy-extract-fns-end

// alloy-graphql-fragments-start
/// GraphQL field selection for GhReview
pub const GH_REVIEW_FIELDS: &str = r#"
    id
    author {
        login
    }
    state
    body
    submittedAt
"#;

/// GraphQL field selection for GhPullRequest
pub const GH_PULL_REQUEST_FIELDS: &str = r#"
    id
    number
    title
    state
    isDraft
    author {
        login
    }
    headRefName
    headRefOid
    baseRefName
    mergeable
    additions
    deletions
    changedFiles
    createdAt
    updatedAt
    mergedAt
    closedAt
    body
"#;

/// GraphQL field selection for GhPrComment
pub const GH_PR_COMMENT_FIELDS: &str = r#"
    id
    author {
        login
    }
    body
    path
    line
    in_reply_to_id
    created_at
    updated_at
"#;

/// GraphQL field selection for GhStatusCheck
pub const GH_STATUS_CHECK_FIELDS: &str = r#"
    context
    state
    target_url
    description
    updated_at
"#;
// alloy-graphql-fragments-end
// alloy-sync-pipelines-start
pub async fn sync_branch(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    repo_id: i64,
    owner: &str,
    name: &str,
) -> Result<()> {
    let endpoint = format!("/repos/{owner}/{name}/branches");
    let poll = db::get_poll_state(conn, &endpoint).await?;

    let mut req = GhRequest::get(&endpoint).paginated();
    if let Some(ref etag) = poll.etag { req = req.with_etag(etag); }

    let resp = gh.call(conn, &req).await?;
    if resp.is_not_modified() { return Ok(()); }

    let items = match resp.body.as_array() {
        Some(a) => a,
        None => return Ok(()),
    };

    for item in items {
        let fields = extract_branch(item);
        upsert_branch(conn, repo_id, &fields.name, fields.sha.as_deref(), fields.behind_default, fields.ahead_default, fields.updated_at.as_deref()).await?;
    }

    Ok(())
}

pub async fn sync_repo(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    owner: &str,
    name: &str,
) -> Result<()> {
    let endpoint = format!("/orgs/{owner}/repos");
    let poll = db::get_poll_state(conn, &endpoint).await?;

    let mut req = GhRequest::get(&endpoint).paginated();
    if let Some(ref etag) = poll.etag { req = req.with_etag(etag); }

    let resp = gh.call(conn, &req).await?;
    if resp.is_not_modified() { return Ok(()); }

    let items = match resp.body.as_array() {
        Some(a) => a,
        None => return Ok(()),
    };

    for item in items {
        let fields = extract_repo(item);
        upsert_repo(conn, &fields.owner, &fields.name, &fields.default_branch, fields.gh_node_id.as_deref(), fields.updated_at.as_deref()).await?;
    }

    Ok(())
}
// alloy-sync-pipelines-end

// Custom code below this line is preserved across re-generation.
