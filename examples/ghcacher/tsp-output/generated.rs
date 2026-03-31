// alloy-imports-start
use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::SqliteConnection;
use clap::{Parser, Subcommand};




// alloy-imports-end
// alloy-row-structs-start
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repo {
  pub id: i64,
  pub owner: String,
  pub name: String,
  pub default_branch: String,
  pub gh_node_id: Option<String>,
  pub updated_at: Option<String>,
}

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
pub struct PullRequest {
  pub id: i64,
  pub repo_id: i64,
  pub number: i64,
  pub gh_node_id: Option<String>,
  pub state: String,
  pub title: String,
  pub author_login: Option<String>,
  pub head_ref: Option<String>,
  pub head_sha: Option<String>,
  pub base_ref: Option<String>,
  pub mergeable: Option<String>,
  pub is_draft: bool,
  pub additions: Option<i64>,
  pub deletions: Option<i64>,
  pub changed_files: Option<i64>,
  pub created_at: String,
  pub updated_at: String,
  pub merged_at: Option<String>,
  pub closed_at: Option<String>,
  pub body: Option<String>,
  pub raw_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrReview {
  pub id: i64,
  pub pr_id: i64,
  pub gh_id: i64,
  pub author_login: Option<String>,
  pub state: String,
  pub body: Option<String>,
  pub submitted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrComment {
  pub id: i64,
  pub pr_id: i64,
  pub gh_id: i64,
  pub author_login: Option<String>,
  pub body: String,
  pub path: Option<String>,
  pub line: Option<i64>,
  pub in_reply_to_id: Option<i64>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrStatusCheck {
  pub id: i64,
  pub pr_id: i64,
  pub context: String,
  pub state: String,
  pub target_url: Option<String>,
  pub description: Option<String>,
  pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrLabel {
  pub pr_id: i64,
  pub label: String,
  pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrRequestedReviewer {
  pub pr_id: i64,
  pub reviewer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoEvent {
  pub id: i64,
  pub repo_id: i64,
  pub gh_id: String,
  pub r#type: String,
  pub actor_login: Option<String>,
  pub payload_json: String,
  pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
  pub id: i64,
  pub gh_id: String,
  pub repo_id: i64,
  pub subject_type: Option<String>,
  pub subject_title: Option<String>,
  pub subject_url: Option<String>,
  pub subject_number: Option<i64>,
  pub html_url: Option<String>,
  pub reason: String,
  pub unread: bool,
  pub updated_at: String,
  pub last_read_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkout {
  pub id: i64,
  pub repo_id: i64,
  pub branch: String,
  pub local_path: String,
  pub sha: Option<String>,
  pub checked_out_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallLog {
  pub id: i64,
  pub endpoint: String,
  pub api_type: String,
  pub method: String,
  pub status_code: Option<i64>,
  pub etag: Option<String>,
  pub last_modified: Option<String>,
  pub rate_remaining: Option<i64>,
  pub rate_reset: Option<i64>,
  pub gql_cost: Option<i64>,
  pub cache_hit: i64,
  pub duration_ms: Option<i64>,
  pub called_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeLog {
  pub id: i64,
  pub entity_type: String,
  pub entity_id: i64,
  pub event: String,
  pub repo_slug: Option<String>,
  pub payload_json: Option<String>,
  pub occurred_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollState {
  pub endpoint: String,
  pub etag: Option<String>,
  pub last_modified: Option<String>,
  pub poll_interval: Option<i64>,
  pub last_polled_at: Option<String>,
  pub last_changed_at: Option<String>,
}
// alloy-row-structs-end
// alloy-extraction-structs-start
pub struct RepoFields {
  pub owner: String,
  pub name: String,
  pub default_branch: String,
  pub gh_node_id: Option<String>,
  pub updated_at: Option<String>,
}

pub struct BranchFields {
  pub name: String,
  pub sha: Option<String>,
  pub behind_default: Option<i64>,
  pub ahead_default: Option<i64>,
  pub updated_at: Option<String>,
}

pub struct PullRequestFields {
  pub number: i64,
  pub gh_node_id: Option<String>,
  pub state: String,
  pub title: String,
  pub author_login: Option<String>,
  pub head_ref: Option<String>,
  pub head_sha: Option<String>,
  pub base_ref: Option<String>,
  pub mergeable: Option<String>,
  pub is_draft: bool,
  pub additions: Option<i64>,
  pub deletions: Option<i64>,
  pub changed_files: Option<i64>,
  pub created_at: String,
  pub updated_at: String,
  pub merged_at: Option<String>,
  pub closed_at: Option<String>,
  pub body: Option<String>,
}

pub struct PrReviewFields {
  pub gh_id: i64,
  pub author_login: Option<String>,
  pub state: String,
  pub body: Option<String>,
  pub submitted_at: Option<String>,
}

pub struct PrCommentFields {
  pub gh_id: i64,
  pub author_login: Option<String>,
  pub body: String,
  pub path: Option<String>,
  pub line: Option<i64>,
  pub in_reply_to_id: Option<i64>,
  pub created_at: String,
  pub updated_at: String,
}

pub struct PrStatusCheckFields {
  pub context: String,
  pub state: String,
  pub target_url: Option<String>,
  pub description: Option<String>,
  pub updated_at: Option<String>,
}

pub struct RepoEventFields {
  pub gh_id: String,
  pub r#type: String,
  pub actor_login: Option<String>,
  pub payload_json: String,
  pub created_at: String,
}

pub struct NotificationFields {
  pub gh_id: String,
  pub subject_type: Option<String>,
  pub subject_title: Option<String>,
  pub subject_url: Option<String>,
  pub reason: String,
  pub unread: bool,
  pub updated_at: String,
  pub last_read_at: Option<String>,
}
// alloy-extraction-structs-end
// alloy-upsert-fns-start
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

pub async fn upsert_pull_request(
    conn: &mut SqliteConnection,
    repo_id: i64,
    number: i64,
    gh_node_id: Option<&str>,
    state: &str,
    title: &str,
    author_login: Option<&str>,
    head_ref: Option<&str>,
    head_sha: Option<&str>,
    base_ref: Option<&str>,
    mergeable: Option<&str>,
    is_draft: bool,
    additions: Option<i64>,
    deletions: Option<i64>,
    changed_files: Option<i64>,
    created_at: &str,
    updated_at: &str,
    merged_at: Option<&str>,
    closed_at: Option<&str>,
    body: Option<&str>,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO pull_request
         (repo_id, number, gh_node_id, state, title, author_login, head_ref, head_sha, base_ref, mergeable, is_draft, additions, deletions, changed_files, created_at, updated_at, merged_at, closed_at, body)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(repo_id, number) DO UPDATE SET
             gh_node_id = excluded.gh_node_id,
             state = excluded.state,
             title = excluded.title,
             author_login = excluded.author_login,
             head_ref = excluded.head_ref,
             head_sha = excluded.head_sha,
             base_ref = excluded.base_ref,
             mergeable = excluded.mergeable,
             is_draft = excluded.is_draft,
             additions = excluded.additions,
             deletions = excluded.deletions,
             changed_files = excluded.changed_files,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             merged_at = excluded.merged_at,
             closed_at = excluded.closed_at,
             body = excluded.body
         RETURNING id"
    )
    .bind(repo_id)
    .bind(number)
    .bind(gh_node_id)
    .bind(state)
    .bind(title)
    .bind(author_login)
    .bind(head_ref)
    .bind(head_sha)
    .bind(base_ref)
    .bind(mergeable)
    .bind(is_draft)
    .bind(additions)
    .bind(deletions)
    .bind(changed_files)
    .bind(created_at)
    .bind(updated_at)
    .bind(merged_at)
    .bind(closed_at)
    .bind(body)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_pr_review(
    conn: &mut SqliteConnection,
    pr_id: i64,
    gh_id: i64,
    author_login: Option<&str>,
    state: &str,
    body: Option<&str>,
    submitted_at: Option<&str>,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO pr_review
         (pr_id, gh_id, author_login, state, body, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(pr_id, gh_id) DO UPDATE SET
             author_login = excluded.author_login,
             state = excluded.state,
             body = excluded.body,
             submitted_at = excluded.submitted_at
         RETURNING id"
    )
    .bind(pr_id)
    .bind(gh_id)
    .bind(author_login)
    .bind(state)
    .bind(body)
    .bind(submitted_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_pr_comment(
    conn: &mut SqliteConnection,
    pr_id: i64,
    gh_id: i64,
    author_login: Option<&str>,
    body: &str,
    path: Option<&str>,
    line: Option<i64>,
    in_reply_to_id: Option<i64>,
    created_at: &str,
    updated_at: &str,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO pr_comment
         (pr_id, gh_id, author_login, body, path, line, in_reply_to_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(pr_id, gh_id) DO UPDATE SET
             author_login = excluded.author_login,
             body = excluded.body,
             path = excluded.path,
             line = excluded.line,
             in_reply_to_id = excluded.in_reply_to_id,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at
         RETURNING id"
    )
    .bind(pr_id)
    .bind(gh_id)
    .bind(author_login)
    .bind(body)
    .bind(path)
    .bind(line)
    .bind(in_reply_to_id)
    .bind(created_at)
    .bind(updated_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_pr_status_check(
    conn: &mut SqliteConnection,
    pr_id: i64,
    context: &str,
    state: &str,
    target_url: Option<&str>,
    description: Option<&str>,
    updated_at: Option<&str>,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO pr_status_check
         (pr_id, context, state, target_url, description, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(pr_id, context) DO UPDATE SET
             state = excluded.state,
             target_url = excluded.target_url,
             description = excluded.description,
             updated_at = excluded.updated_at
         RETURNING id"
    )
    .bind(pr_id)
    .bind(context)
    .bind(state)
    .bind(target_url)
    .bind(description)
    .bind(updated_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_pr_label(
    conn: &mut SqliteConnection,
    pr_id: i64,
    label: &str,
    color: Option<&str>,
) -> Result<()> {
    sqlx::query(
        "INSERT OR IGNORE INTO pr_label
         (pr_id, label, color)
         VALUES (?, ?, ?)"
    )
    .bind(pr_id)
    .bind(label)
    .bind(color)
    .execute(conn)
    .await?;
    Ok(())
}

pub async fn upsert_pr_requested_reviewer(
    conn: &mut SqliteConnection,
    pr_id: i64,
    reviewer: &str,
) -> Result<()> {
    sqlx::query(
        "INSERT OR IGNORE INTO pr_requested_reviewer
         (pr_id, reviewer)
         VALUES (?, ?)"
    )
    .bind(pr_id)
    .bind(reviewer)
    .execute(conn)
    .await?;
    Ok(())
}

pub async fn insert_repo_event(
    conn: &mut SqliteConnection,
    repo_id: i64,
    gh_id: &str,
    r#type: &str,
    actor_login: Option<&str>,
    payload_json: &str,
    created_at: &str,
) -> Result<()> {
    sqlx::query(
        "INSERT OR IGNORE INTO repo_event
         (repo_id, gh_id, type, actor_login, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(repo_id)
    .bind(gh_id)
    .bind(r#type)
    .bind(actor_login)
    .bind(payload_json)
    .bind(created_at)
    .execute(conn)
    .await?;
    Ok(())
}

pub async fn upsert_notification(
    conn: &mut SqliteConnection,
    gh_id: &str,
    repo_id: i64,
    subject_type: Option<&str>,
    subject_title: Option<&str>,
    subject_url: Option<&str>,
    reason: &str,
    unread: bool,
    updated_at: &str,
    last_read_at: Option<&str>,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO notification
         (gh_id, repo_id, subject_type, subject_title, subject_url, reason, unread, updated_at, last_read_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(gh_id) DO UPDATE SET
             repo_id = excluded.repo_id,
             subject_type = excluded.subject_type,
             subject_title = excluded.subject_title,
             subject_url = excluded.subject_url,
             reason = excluded.reason,
             unread = excluded.unread,
             updated_at = excluded.updated_at,
             last_read_at = excluded.last_read_at
         RETURNING id"
    )
    .bind(gh_id)
    .bind(repo_id)
    .bind(subject_type)
    .bind(subject_title)
    .bind(subject_url)
    .bind(reason)
    .bind(unread)
    .bind(updated_at)
    .bind(last_read_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_checkout(
    conn: &mut SqliteConnection,
    repo_id: i64,
    branch: &str,
    local_path: &str,
    sha: Option<&str>,
    checked_out_at: &str,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO checkout
         (repo_id, branch, local_path, sha, checked_out_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(repo_id, branch) DO UPDATE SET
             local_path = excluded.local_path,
             sha = excluded.sha,
             checked_out_at = excluded.checked_out_at
         RETURNING id"
    )
    .bind(repo_id)
    .bind(branch)
    .bind(local_path)
    .bind(sha)
    .bind(checked_out_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_call_log(
    conn: &mut SqliteConnection,
    endpoint: &str,
    api_type: &str,
    method: &str,
    status_code: Option<i64>,
    etag: Option<&str>,
    last_modified: Option<&str>,
    rate_remaining: Option<i64>,
    rate_reset: Option<i64>,
    gql_cost: Option<i64>,
    cache_hit: i64,
    duration_ms: Option<i64>,
    called_at: &str,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO call_log
         (endpoint, api_type, method, status_code, etag, last_modified, rate_remaining, rate_reset, gql_cost, cache_hit, duration_ms, called_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
             endpoint = excluded.endpoint,
             api_type = excluded.api_type,
             method = excluded.method,
             status_code = excluded.status_code,
             etag = excluded.etag,
             last_modified = excluded.last_modified,
             rate_remaining = excluded.rate_remaining,
             rate_reset = excluded.rate_reset,
             gql_cost = excluded.gql_cost,
             cache_hit = excluded.cache_hit,
             duration_ms = excluded.duration_ms,
             called_at = excluded.called_at
         RETURNING id"
    )
    .bind(endpoint)
    .bind(api_type)
    .bind(method)
    .bind(status_code)
    .bind(etag)
    .bind(last_modified)
    .bind(rate_remaining)
    .bind(rate_reset)
    .bind(gql_cost)
    .bind(cache_hit)
    .bind(duration_ms)
    .bind(called_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_change_log(
    conn: &mut SqliteConnection,
    entity_type: &str,
    entity_id: i64,
    event: &str,
    repo_slug: Option<&str>,
    payload_json: Option<&str>,
    occurred_at: &str,
) -> Result<i64> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO change_log
         (entity_type, entity_id, event, repo_slug, payload_json, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
             entity_type = excluded.entity_type,
             entity_id = excluded.entity_id,
             event = excluded.event,
             repo_slug = excluded.repo_slug,
             payload_json = excluded.payload_json,
             occurred_at = excluded.occurred_at
         RETURNING id"
    )
    .bind(entity_type)
    .bind(entity_id)
    .bind(event)
    .bind(repo_slug)
    .bind(payload_json)
    .bind(occurred_at)
    .fetch_one(conn)
    .await?;
    Ok(id)
}

pub async fn upsert_poll_state(
    conn: &mut SqliteConnection,
    endpoint: &str,
    etag: Option<&str>,
    last_modified: Option<&str>,
    poll_interval: Option<i64>,
    last_polled_at: Option<&str>,
    last_changed_at: Option<&str>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO poll_state
         (endpoint, etag, last_modified, poll_interval, last_polled_at, last_changed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
             etag = excluded.etag,
             last_modified = excluded.last_modified,
             poll_interval = excluded.poll_interval,
             last_polled_at = excluded.last_polled_at,
             last_changed_at = excluded.last_changed_at
        "
    )
    .bind(endpoint)
    .bind(etag)
    .bind(last_modified)
    .bind(poll_interval)
    .bind(last_polled_at)
    .bind(last_changed_at)
    .execute(conn)
    .await?;
    Ok(())
}
// alloy-upsert-fns-end
// alloy-extract-fns-start
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

/// Extract Branch fields from a GhBranch JSON value.
pub fn extract_branch(src: &serde_json::Value) -> BranchFields {
    let name = src["name"].as_str().unwrap_or("").to_owned();
    let sha = src["commit"].as_str().map(|s| s.to_owned());
    BranchFields {
        name,
        sha,
    }
}

/// Extract PullRequest fields from a GhPullRequest JSON value.
pub fn extract_pull_request(src: &serde_json::Value) -> PullRequestFields {
    let number = src["number"].as_i64().unwrap_or(0);
    let gh_node_id = src["id"].as_str().map(|s| s.to_owned());
    let state = src["state"].as_str().unwrap_or("").to_owned();
    let title = src["title"].as_str().unwrap_or("").to_owned();
    let author_login = src["author"]["login"].as_str().map(|s| s.to_owned());
    let head_ref = src["headRefName"].as_str().map(|s| s.to_owned());
    let head_sha = src["headRefOid"].as_str().map(|s| s.to_owned());
    let base_ref = src["baseRefName"].as_str().map(|s| s.to_owned());
    let mergeable = src["mergeable"].as_str().map(|s| s.to_owned());
    let is_draft = src["isDraft"].as_bool().unwrap_or(false);
    let additions = src["additions"].as_i64();
    let deletions = src["deletions"].as_i64();
    let changed_files = src["changedFiles"].as_i64();
    let created_at = src["createdAt"].as_str().unwrap_or("").to_owned();
    let updated_at = src["updatedAt"].as_str().unwrap_or("").to_owned();
    let merged_at = src["mergedAt"].as_str().map(|s| s.to_owned());
    let closed_at = src["closedAt"].as_str().map(|s| s.to_owned());
    let body = src["body"].as_str().map(|s| s.to_owned());
    PullRequestFields {
        number,
        gh_node_id,
        state,
        title,
        author_login,
        head_ref,
        head_sha,
        base_ref,
        mergeable,
        is_draft,
        additions,
        deletions,
        changed_files,
        created_at,
        updated_at,
        merged_at,
        closed_at,
        body,
    }
}

/// Extract PrReview fields from a GhReview JSON value.
pub fn extract_pr_review(src: &serde_json::Value) -> PrReviewFields {
    let gh_id = src["id"].as_i64().unwrap_or(0);
    let author_login = src["author"]["login"].as_str().map(|s| s.to_owned());
    let state = src["state"].as_str().unwrap_or("").to_owned();
    let body = src["body"].as_str().map(|s| s.to_owned());
    let submitted_at = src["submittedAt"].as_str().map(|s| s.to_owned());
    PrReviewFields {
        gh_id,
        author_login,
        state,
        body,
        submitted_at,
    }
}

/// Extract PrComment fields from a GhPrComment JSON value.
pub fn extract_pr_comment(src: &serde_json::Value) -> PrCommentFields {
    let gh_id = src["id"].as_i64().unwrap_or(0);
    let author_login = src["author"]["login"].as_str().map(|s| s.to_owned());
    let body = src["body"].as_str().unwrap_or("").to_owned();
    let path = src["path"].as_str().map(|s| s.to_owned());
    let line = src["line"].as_i64();
    let in_reply_to_id = src["in_reply_to_id"].as_i64();
    let created_at = src["created_at"].as_str().unwrap_or("").to_owned();
    let updated_at = src["updated_at"].as_str().unwrap_or("").to_owned();
    PrCommentFields {
        gh_id,
        author_login,
        body,
        path,
        line,
        in_reply_to_id,
        created_at,
        updated_at,
    }
}

/// Extract PrStatusCheck fields from a GhStatusCheck JSON value.
pub fn extract_pr_status_check(src: &serde_json::Value) -> PrStatusCheckFields {
    let context = src["context"].as_str().unwrap_or("").to_owned();
    let state = src["state"].as_str().unwrap_or("").to_owned();
    let target_url = src["target_url"].as_str().map(|s| s.to_owned());
    let description = src["description"].as_str().map(|s| s.to_owned());
    let updated_at = src["updated_at"].as_str().map(|s| s.to_owned());
    PrStatusCheckFields {
        context,
        state,
        target_url,
        description,
        updated_at,
    }
}

/// Extract RepoEvent fields from a GhRepoEvent JSON value.
pub fn extract_repo_event(src: &serde_json::Value) -> RepoEventFields {
    let gh_id = src["id"].as_str().unwrap_or("").to_owned();
    let r#type = src["type"].as_str().unwrap_or("").to_owned();
    let actor_login = src["actor"]["login"].as_str().map(|s| s.to_owned());
    let payload_json = src["payload"].as_str().unwrap_or("").to_owned();
    let created_at = src["created_at"].as_str().unwrap_or("").to_owned();
    RepoEventFields {
        gh_id,
        r#type,
        actor_login,
        payload_json,
        created_at,
    }
}

/// Extract Notification fields from a GhNotification JSON value.
pub fn extract_notification(src: &serde_json::Value) -> NotificationFields {
    let gh_id = src["id"].as_str().unwrap_or("").to_owned();
    let subject_type = src["subject"]["type"].as_str().map(|s| s.to_owned());
    let subject_title = src["subject"]["title"].as_str().map(|s| s.to_owned());
    let subject_url = src["subject"]["url"].as_str().map(|s| s.to_owned());
    let reason = src["reason"].as_str().unwrap_or("").to_owned();
    let unread = src["unread"].as_bool().unwrap_or(false);
    let updated_at = src["updated_at"].as_str().unwrap_or("").to_owned();
    let last_read_at = src["last_read_at"].as_str().map(|s| s.to_owned());
    NotificationFields {
        gh_id,
        subject_type,
        subject_title,
        subject_url,
        reason,
        unread,
        updated_at,
        last_read_at,
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

pub async fn sync_pull_request(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    repo_id: i64,
) -> Result<()> {
    gh.throttle_if_needed(conn, "graphql").await?;
    let items: &Vec<serde_json::Value> = todo!("wire up GraphQL query");

    for item in items {
        let fields = extract_pull_request(item);
        upsert_pull_request(conn, repo_id, fields.number, fields.gh_node_id.as_deref(), &fields.state, &fields.title, fields.author_login.as_deref(), fields.head_ref.as_deref(), fields.head_sha.as_deref(), fields.base_ref.as_deref(), fields.mergeable.as_deref(), fields.is_draft, fields.additions, fields.deletions, fields.changed_files, &fields.created_at, &fields.updated_at, fields.merged_at.as_deref(), fields.closed_at.as_deref(), fields.body.as_deref()).await?;
    }

    Ok(())
}

pub async fn sync_pr_review(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    pr_id: i64,
) -> Result<()> {
    gh.throttle_if_needed(conn, "graphql").await?;
    let items: &Vec<serde_json::Value> = todo!("wire up GraphQL query");

    for item in items {
        let fields = extract_pr_review(item);
        upsert_pr_review(conn, pr_id, fields.gh_id, fields.author_login.as_deref(), &fields.state, fields.body.as_deref(), fields.submitted_at.as_deref()).await?;
    }

    Ok(())
}

pub async fn sync_pr_comment(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    pr_id: i64,
) -> Result<()> {
    gh.throttle_if_needed(conn, "graphql").await?;
    let items: &Vec<serde_json::Value> = todo!("wire up GraphQL query");

    for item in items {
        let fields = extract_pr_comment(item);
        upsert_pr_comment(conn, pr_id, fields.gh_id, fields.author_login.as_deref(), &fields.body, fields.path.as_deref(), fields.line, fields.in_reply_to_id, &fields.created_at, &fields.updated_at).await?;
    }

    Ok(())
}

pub async fn sync_pr_status_check(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    pr_id: i64,
) -> Result<()> {
    gh.throttle_if_needed(conn, "graphql").await?;
    let items: &Vec<serde_json::Value> = todo!("wire up GraphQL query");

    for item in items {
        let fields = extract_pr_status_check(item);
        upsert_pr_status_check(conn, pr_id, &fields.context, &fields.state, fields.target_url.as_deref(), fields.description.as_deref(), fields.updated_at.as_deref()).await?;
    }

    Ok(())
}

pub async fn sync_repo_event(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    repo_id: i64,
    owner: &str,
    name: &str,
) -> Result<()> {
    let endpoint = format!("/repos/{owner}/{name}/events");
    let poll = db::get_poll_state(conn, &endpoint).await?;

    if let (Some(interval), Some(ref last_polled)) = (poll.poll_interval, &poll.last_polled_at) {
        if let Ok(last) = chrono::DateTime::parse_from_rfc3339(last_polled) {
            let elapsed = chrono::Utc::now().signed_duration_since(last).num_seconds();
            if elapsed < interval { return Ok(()); }
        }
    }

    let mut req = GhRequest::get(&endpoint).paginated();
    if let Some(ref etag) = poll.etag { req = req.with_etag(etag); }

    let resp = gh.call(conn, &req).await?;
    if resp.is_not_modified() { return Ok(()); }

    let items = match resp.body.as_array() {
        Some(a) => a,
        None => return Ok(()),
    };

    for item in items {
        let fields = extract_repo_event(item);
        insert_repo_event(conn, repo_id, &fields.gh_id, &fields.r#type, fields.actor_login.as_deref(), &fields.payload_json, &fields.created_at).await?;
    }

    Ok(())
}

pub async fn sync_notification(
    conn: &mut SqliteConnection,
    gh: &dyn GitHubClient,
    repo_id: i64,
) -> Result<()> {
    let endpoint = "/notifications".to_owned();
    let poll = db::get_poll_state(conn, &endpoint).await?;

    let mut req = GhRequest::get(&endpoint);
    if let Some(ref etag) = poll.etag { req = req.with_etag(etag); }

    let resp = gh.call(conn, &req).await?;
    if resp.is_not_modified() { return Ok(()); }

    let items = match resp.body.as_array() {
        Some(a) => a,
        None => return Ok(()),
    };

    for item in items {
        let fields = extract_notification(item);
        upsert_notification(conn, &fields.gh_id, repo_id, fields.subject_type.as_deref(), fields.subject_title.as_deref(), fields.subject_url.as_deref(), &fields.reason, fields.unread, &fields.updated_at, fields.last_read_at.as_deref()).await?;
    }

    Ok(())
}
// alloy-sync-pipelines-end
// alloy-config-start
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
  #[serde(skip_serializing)]
  pub github_token: String,
  pub org: String,
  #[serde(default = "default_app_settings_db_path")]
  pub db_path: String,
  #[serde(default = "default_app_settings_poll_interval")]
  pub poll_interval: i64,
  #[serde(default = "default_app_settings_sync_notifications")]
  pub sync_notifications: bool,
  #[serde(default = "default_app_settings_max_concurrency")]
  pub max_concurrency: i64,
}
fn default_app_settings_db_path() -> String { "ghcacher.db".to_owned() }
fn default_app_settings_poll_interval() -> i64 { 60 }
fn default_app_settings_sync_notifications() -> bool { true }
fn default_app_settings_max_concurrency() -> i64 { 5 }

impl AppSettings {
    pub fn load() -> Result<Self> {
        let path = shellexpand::tilde("~/.config/ghcacher/config.toml").to_string();
        let contents = std::fs::read_to_string(&path)?;
        let config: Self = toml::from_str(&contents)?;
        Ok(config)
    }
}
// alloy-config-end
// alloy-cli-start

#[derive(Debug, Clone, Parser)]
#[command(about = "GitHub organization cacher")]
pub struct AppSettingsCli {

      #[arg(long, env = "GITHUB_TOKEN", help = "GitHub personal access token")]
      pub github_token: String,
      #[arg(long, short = 'o', env = "GHCACHER_ORG", help = "GitHub organization to cache")]
      pub org: String,
      #[arg(long, env = "GHCACHER_DB", default_value = "ghcacher.db", help = "SQLite database path")]
      pub db_path: String,
      #[arg(long, short = 'i', default_value = "60", help = "Poll interval in seconds")]
      pub poll_interval: i64,
      #[arg(long, default_value = "true", help = "Enable notification sync")]
      pub sync_notifications: bool,
      #[arg(long, default_value = "5", help = "Max concurrent API requests")]
      pub max_concurrency: i64,
      #[command(subcommand)]
      pub command: AppSettingsSubcommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum AppSettingsSubcommand {
  /// Run sync loop
  SyncCmd(SyncCmdCli),
  /// Query cached data
  QueryCmd(QueryCmdCli),
}
#[derive(Debug, Clone, Parser)]
#[command(about = "Run sync loop")]
pub struct SyncCmdCli {

      #[arg(long, help = "Run once and exit")]
      pub once: Option<bool>,
      #[arg(long, help = "Sync only PRs")]
      pub prs_only: Option<bool>,
}
#[derive(Debug, Clone, Parser)]
#[command(about = "Query cached data")]
pub struct QueryCmdCli {

      #[arg(index = 0, help = "Entity to query: prs, repos, branches, notifications")]
      pub entity: String,
      #[arg(long, short = 'r', help = "Filter by repo slug (owner/name)")]
      pub repo: Option<String>,
      #[arg(long, short = 'n', help = "Max results")]
      pub limit: Option<i64>,
      #[arg(long, help = "Output format: table, json, csv")]
      pub format: Option<String>,
}
// alloy-cli-end
// alloy-config-cli-merge-start
impl AppSettings {
    /// Apply CLI overrides. CLI values take precedence over config file.
    pub fn with_cli(mut self, cli: &AppSettingsCli) -> Self {
        self.github_token = cli.github_token.clone();
        self.org = cli.org.clone();
        self.db_path = cli.db_path.clone();
        self.poll_interval = cli.poll_interval;
        self.sync_notifications = cli.sync_notifications;
        self.max_concurrency = cli.max_concurrency;
        self
    }

    /// Apply environment variable overrides.
    pub fn with_env(mut self) -> Self {
        if let Ok(val) = std::env::var("GITHUB_TOKEN") {
            self.github_token = val;
        }
        if let Ok(val) = std::env::var("GHCACHER_ORG") {
            self.org = val;
        }
        if let Ok(val) = std::env::var("GHCACHER_DB") {
            self.db_path = val;
        }
        self
    }
}
// alloy-config-cli-merge-end

// Custom code below this line is preserved across re-generation.
