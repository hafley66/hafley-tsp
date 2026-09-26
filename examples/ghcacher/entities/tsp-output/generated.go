package db

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/jmoiron/sqlx"
)

type Branch struct {
  Id int64 `db:"id" json:"id"`
  RepoId int64 `db:"repo_id" json:"repo"`
  Name string `db:"name" json:"name"`
  Sha *string `db:"sha" json:"sha"`
  BehindDefault *int64 `db:"behind_default" json:"behind_default"`
  AheadDefault *int64 `db:"ahead_default" json:"ahead_default"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type Repo struct {
  Id int64 `db:"id" json:"id"`
  Owner string `db:"owner" json:"owner"`
  Name string `db:"name" json:"name"`
  DefaultBranch string `db:"default_branch" json:"default_branch"`
  GhNodeId *string `db:"gh_node_id" json:"gh_node_id"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type BranchFields struct {
  Name string `db:"name" json:"name"`
  Sha *string `db:"sha" json:"sha"`
  BehindDefault *int64 `db:"behind_default" json:"behind_default"`
  AheadDefault *int64 `db:"ahead_default" json:"ahead_default"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type RepoFields struct {
  Owner string `db:"owner" json:"owner"`
  Name string `db:"name" json:"name"`
  DefaultBranch string `db:"default_branch" json:"default_branch"`
  GhNodeId *string `db:"gh_node_id" json:"gh_node_id"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

// ── JSON access helpers ──

func jsonString(v interface{}) string {
	if s, ok := v.(string); ok { return s }
	return ""
}

func jsonOptString(v interface{}) *string {
	if v == nil { return nil }
	s := jsonString(v)
	return &s
}

func jsonInt64(v interface{}) int64 {
	if n, ok := v.(float64); ok { return int64(n) }
	return 0
}

func jsonOptInt64(v interface{}) *int64 {
	if v == nil { return nil }
	n := jsonInt64(v)
	return &n
}

func jsonBool(v interface{}) bool {
	if b, ok := v.(bool); ok { return b }
	return false
}

func jsonOptBool(v interface{}) *bool {
	if v == nil { return nil }
	b := jsonBool(v)
	return &b
}

func dig(m map[string]interface{}, keys ...string) interface{} {
	var cur interface{} = m
	for _, k := range keys {
		if mm, ok := cur.(map[string]interface{}); ok {
			cur = mm[k]
		} else {
			return nil
		}
	}
	return cur
}

func UpsertBranch(ctx context.Context, db *sqlx.DB, repo_id int64, name string, sha *string, behind_default *int64, ahead_default *int64, updated_at *string) (int64, error) {
	query := `INSERT INTO branch
		(repo_id, name, sha, behind_default, ahead_default, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(repo_id, name) DO UPDATE SET
			sha = excluded.sha,
			behind_default = excluded.behind_default,
			ahead_default = excluded.ahead_default,
			updated_at = excluded.updated_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, repo_id, name, sha, behind_default, ahead_default, updated_at).Scan(&id)
	return id, err
}

func UpsertRepo(ctx context.Context, db *sqlx.DB, owner string, name string, default_branch string, gh_node_id *string, updated_at *string) (int64, error) {
	query := `INSERT INTO repo
		(owner, name, default_branch, gh_node_id, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT(owner, name) DO UPDATE SET
			default_branch = excluded.default_branch,
			gh_node_id = excluded.gh_node_id,
			updated_at = excluded.updated_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, owner, name, default_branch, gh_node_id, updated_at).Scan(&id)
	return id, err
}

// ExtractBranch extracts Branch fields from a GhBranch JSON value.
func ExtractBranch(src map[string]interface{}) BranchFields {
	return BranchFields{
		Name: jsonString(src["name"]),
		Sha: jsonOptString(src["commit"]),
	}
}

// ExtractRepo extracts Repo fields from a GhRepo JSON value.
func ExtractRepo(src map[string]interface{}) RepoFields {
	return RepoFields{
		Owner: jsonString(dig(src, "owner", "login")),
		Name: jsonString(src["name"]),
		DefaultBranch: jsonString(dig(src, "defaultBranchRef", "name")),
	}
}
