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

CREATE TABLE IF NOT EXISTS repo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    gh_node_id TEXT,
    updated_at TEXT,
    UNIQUE(owner, name)
);

