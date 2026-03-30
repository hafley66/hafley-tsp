CREATE TABLE IF NOT EXISTS repo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    gh_node_id TEXT,
    updated_at TEXT,
    UNIQUE(owner, name)
);

CREATE TABLE IF NOT EXISTS branch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL REFERENCES repo(id),
    name TEXT NOT NULL,
    sha TEXT,
    behind_default INTEGER,
    ahead_default INTEGER,
    updated_at TEXT,
    UNIQUE(repo_id, name)
);

CREATE TABLE IF NOT EXISTS pull_request (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL REFERENCES repo(id),
    number INTEGER NOT NULL,
    gh_node_id TEXT,
    state TEXT NOT NULL,
    title TEXT NOT NULL,
    author_login TEXT,
    head_ref TEXT,
    head_sha TEXT,
    base_ref TEXT,
    mergeable TEXT,
    is_draft INTEGER NOT NULL DEFAULT 0,
    additions INTEGER,
    deletions INTEGER,
    changed_files INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    merged_at TEXT,
    closed_at TEXT,
    body TEXT,
    raw_json TEXT,
    UNIQUE(repo_id, number)
);

CREATE TABLE IF NOT EXISTS pr_review (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id INTEGER NOT NULL REFERENCES pull_request(id),
    gh_id INTEGER NOT NULL,
    author_login TEXT,
    state TEXT NOT NULL,
    body TEXT,
    submitted_at TEXT,
    UNIQUE(pr_id, gh_id)
);

CREATE TABLE IF NOT EXISTS pr_comment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id INTEGER NOT NULL REFERENCES pull_request(id),
    gh_id INTEGER NOT NULL,
    author_login TEXT,
    body TEXT NOT NULL,
    path TEXT,
    line INTEGER,
    in_reply_to_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(pr_id, gh_id)
);

CREATE TABLE IF NOT EXISTS pr_status_check (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id INTEGER NOT NULL REFERENCES pull_request(id),
    context TEXT NOT NULL,
    state TEXT NOT NULL,
    target_url TEXT,
    description TEXT,
    updated_at TEXT,
    UNIQUE(pr_id, context)
);

CREATE TABLE IF NOT EXISTS pr_label (
    pr_id INTEGER NOT NULL REFERENCES pull_request(id),
    label TEXT NOT NULL,
    color TEXT,
    PRIMARY KEY (pr_id, label)
);

CREATE TABLE IF NOT EXISTS pr_requested_reviewer (
    pr_id INTEGER NOT NULL REFERENCES pull_request(id),
    reviewer TEXT NOT NULL,
    PRIMARY KEY (pr_id, reviewer)
);

CREATE TABLE IF NOT EXISTS repo_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL REFERENCES repo(id),
    gh_id TEXT NOT NULL,
    type TEXT NOT NULL,
    actor_login TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(repo_id, gh_id)
);

CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gh_id TEXT NOT NULL,
    repo_id INTEGER NOT NULL REFERENCES repo(id),
    subject_type TEXT,
    subject_title TEXT,
    subject_url TEXT,
    subject_number INTEGER,
    html_url TEXT,
    reason TEXT NOT NULL,
    unread INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    last_read_at TEXT
);

CREATE TABLE IF NOT EXISTS checkout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL REFERENCES repo(id),
    branch TEXT NOT NULL,
    local_path TEXT NOT NULL,
    sha TEXT,
    checked_out_at TEXT NOT NULL,
    UNIQUE(repo_id, branch)
);

CREATE TABLE IF NOT EXISTS call_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    api_type TEXT NOT NULL DEFAULT 'rest',
    method TEXT NOT NULL DEFAULT 'GET',
    status_code INTEGER,
    etag TEXT,
    last_modified TEXT,
    rate_remaining INTEGER,
    rate_reset INTEGER,
    gql_cost INTEGER,
    cache_hit INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    called_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    event TEXT NOT NULL,
    repo_slug TEXT,
    payload_json TEXT,
    occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS poll_state (
    endpoint TEXT PRIMARY KEY,
    etag TEXT,
    last_modified TEXT,
    poll_interval INTEGER,
    last_polled_at TEXT,
    last_changed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pull_request_repo_id_state ON pull_request(repo_id, state);
CREATE INDEX IF NOT EXISTS idx_pull_request_updated_at ON pull_request(updated_at);
CREATE INDEX IF NOT EXISTS idx_repo_event_repo_id_type ON repo_event(repo_id, type);
CREATE INDEX IF NOT EXISTS idx_repo_event_created_at ON repo_event(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_unread_updated_at ON notification(unread, updated_at);
CREATE INDEX IF NOT EXISTS idx_call_log_endpoint_called_at ON call_log(endpoint, called_at);
CREATE INDEX IF NOT EXISTS idx_change_log_entity_type_occurred_at ON change_log(entity_type, occurred_at);
