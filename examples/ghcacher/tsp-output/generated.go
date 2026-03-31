package db

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/jmoiron/sqlx"
)

type Repo struct {
  Id int64 `db:"id" json:"id"`
  Owner string `db:"owner" json:"owner"`
  Name string `db:"name" json:"name"`
  DefaultBranch string `db:"default_branch" json:"default_branch"`
  GhNodeId *string `db:"gh_node_id" json:"gh_node_id"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type Branch struct {
  Id int64 `db:"id" json:"id"`
  RepoId int64 `db:"repo_id" json:"repo_id"`
  Name string `db:"name" json:"name"`
  Sha *string `db:"sha" json:"sha"`
  BehindDefault *int64 `db:"behind_default" json:"behind_default"`
  AheadDefault *int64 `db:"ahead_default" json:"ahead_default"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type PullRequest struct {
  Id int64 `db:"id" json:"id"`
  RepoId int64 `db:"repo_id" json:"repo_id"`
  Number int64 `db:"number" json:"number"`
  GhNodeId *string `db:"gh_node_id" json:"gh_node_id"`
  State string `db:"state" json:"state"`
  Title string `db:"title" json:"title"`
  AuthorLogin *string `db:"author_login" json:"author_login"`
  HeadRef *string `db:"head_ref" json:"head_ref"`
  HeadSha *string `db:"head_sha" json:"head_sha"`
  BaseRef *string `db:"base_ref" json:"base_ref"`
  Mergeable *string `db:"mergeable" json:"mergeable"`
  IsDraft bool `db:"is_draft" json:"is_draft"`
  Additions *int64 `db:"additions" json:"additions"`
  Deletions *int64 `db:"deletions" json:"deletions"`
  ChangedFiles *int64 `db:"changed_files" json:"changed_files"`
  CreatedAt string `db:"created_at" json:"created_at"`
  UpdatedAt string `db:"updated_at" json:"updated_at"`
  MergedAt *string `db:"merged_at" json:"merged_at"`
  ClosedAt *string `db:"closed_at" json:"closed_at"`
  Body *string `db:"body" json:"body"`
  RawJson *string `db:"raw_json" json:"raw_json"`
}

type PrReview struct {
  Id int64 `db:"id" json:"id"`
  PrId int64 `db:"pr_id" json:"pr_id"`
  GhId int64 `db:"gh_id" json:"gh_id"`
  AuthorLogin *string `db:"author_login" json:"author_login"`
  State string `db:"state" json:"state"`
  Body *string `db:"body" json:"body"`
  SubmittedAt *string `db:"submitted_at" json:"submitted_at"`
}

type PrComment struct {
  Id int64 `db:"id" json:"id"`
  PrId int64 `db:"pr_id" json:"pr_id"`
  GhId int64 `db:"gh_id" json:"gh_id"`
  AuthorLogin *string `db:"author_login" json:"author_login"`
  Body string `db:"body" json:"body"`
  Path *string `db:"path" json:"path"`
  Line *int64 `db:"line" json:"line"`
  InReplyToId *int64 `db:"in_reply_to_id" json:"in_reply_to_id"`
  CreatedAt string `db:"created_at" json:"created_at"`
  UpdatedAt string `db:"updated_at" json:"updated_at"`
}

type PrStatusCheck struct {
  Id int64 `db:"id" json:"id"`
  PrId int64 `db:"pr_id" json:"pr_id"`
  Context string `db:"context" json:"context"`
  State string `db:"state" json:"state"`
  TargetUrl *string `db:"target_url" json:"target_url"`
  Description *string `db:"description" json:"description"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type PrLabel struct {
  PrId int64 `db:"pr_id" json:"pr_id"`
  Label string `db:"label" json:"label"`
  Color *string `db:"color" json:"color"`
}

type PrRequestedReviewer struct {
  PrId int64 `db:"pr_id" json:"pr_id"`
  Reviewer string `db:"reviewer" json:"reviewer"`
}

type RepoEvent struct {
  Id int64 `db:"id" json:"id"`
  RepoId int64 `db:"repo_id" json:"repo_id"`
  GhId string `db:"gh_id" json:"gh_id"`
  Type string `db:"type" json:"type"`
  ActorLogin *string `db:"actor_login" json:"actor_login"`
  PayloadJson string `db:"payload_json" json:"payload_json"`
  CreatedAt string `db:"created_at" json:"created_at"`
}

type Notification struct {
  Id int64 `db:"id" json:"id"`
  GhId string `db:"gh_id" json:"gh_id"`
  RepoId int64 `db:"repo_id" json:"repo_id"`
  SubjectType *string `db:"subject_type" json:"subject_type"`
  SubjectTitle *string `db:"subject_title" json:"subject_title"`
  SubjectUrl *string `db:"subject_url" json:"subject_url"`
  SubjectNumber *int64 `db:"subject_number" json:"subject_number"`
  HtmlUrl *string `db:"html_url" json:"html_url"`
  Reason string `db:"reason" json:"reason"`
  Unread bool `db:"unread" json:"unread"`
  UpdatedAt string `db:"updated_at" json:"updated_at"`
  LastReadAt *string `db:"last_read_at" json:"last_read_at"`
}

type Checkout struct {
  Id int64 `db:"id" json:"id"`
  RepoId int64 `db:"repo_id" json:"repo_id"`
  Branch string `db:"branch" json:"branch"`
  LocalPath string `db:"local_path" json:"local_path"`
  Sha *string `db:"sha" json:"sha"`
  CheckedOutAt string `db:"checked_out_at" json:"checked_out_at"`
}

type CallLog struct {
  Id int64 `db:"id" json:"id"`
  Endpoint string `db:"endpoint" json:"endpoint"`
  ApiType string `db:"api_type" json:"api_type"`
  Method string `db:"method" json:"method"`
  StatusCode *int64 `db:"status_code" json:"status_code"`
  Etag *string `db:"etag" json:"etag"`
  LastModified *string `db:"last_modified" json:"last_modified"`
  RateRemaining *int64 `db:"rate_remaining" json:"rate_remaining"`
  RateReset *int64 `db:"rate_reset" json:"rate_reset"`
  GqlCost *int64 `db:"gql_cost" json:"gql_cost"`
  CacheHit int64 `db:"cache_hit" json:"cache_hit"`
  DurationMs *int64 `db:"duration_ms" json:"duration_ms"`
  CalledAt string `db:"called_at" json:"called_at"`
}

type ChangeLog struct {
  Id int64 `db:"id" json:"id"`
  EntityType string `db:"entity_type" json:"entity_type"`
  EntityId int64 `db:"entity_id" json:"entity_id"`
  Event string `db:"event" json:"event"`
  RepoSlug *string `db:"repo_slug" json:"repo_slug"`
  PayloadJson *string `db:"payload_json" json:"payload_json"`
  OccurredAt string `db:"occurred_at" json:"occurred_at"`
}

type PollState struct {
  Endpoint string `db:"endpoint" json:"endpoint"`
  Etag *string `db:"etag" json:"etag"`
  LastModified *string `db:"last_modified" json:"last_modified"`
  PollInterval *int64 `db:"poll_interval" json:"poll_interval"`
  LastPolledAt *string `db:"last_polled_at" json:"last_polled_at"`
  LastChangedAt *string `db:"last_changed_at" json:"last_changed_at"`
}

type RepoFields struct {
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

type PullRequestFields struct {
  Number int64 `db:"number" json:"number"`
  GhNodeId *string `db:"gh_node_id" json:"gh_node_id"`
  State string `db:"state" json:"state"`
  Title string `db:"title" json:"title"`
  AuthorLogin *string `db:"author_login" json:"author_login"`
  HeadRef *string `db:"head_ref" json:"head_ref"`
  HeadSha *string `db:"head_sha" json:"head_sha"`
  BaseRef *string `db:"base_ref" json:"base_ref"`
  Mergeable *string `db:"mergeable" json:"mergeable"`
  IsDraft bool `db:"is_draft" json:"is_draft"`
  Additions *int64 `db:"additions" json:"additions"`
  Deletions *int64 `db:"deletions" json:"deletions"`
  ChangedFiles *int64 `db:"changed_files" json:"changed_files"`
  CreatedAt string `db:"created_at" json:"created_at"`
  UpdatedAt string `db:"updated_at" json:"updated_at"`
  MergedAt *string `db:"merged_at" json:"merged_at"`
  ClosedAt *string `db:"closed_at" json:"closed_at"`
  Body *string `db:"body" json:"body"`
}

type PrReviewFields struct {
  GhId int64 `db:"gh_id" json:"gh_id"`
  AuthorLogin *string `db:"author_login" json:"author_login"`
  State string `db:"state" json:"state"`
  Body *string `db:"body" json:"body"`
  SubmittedAt *string `db:"submitted_at" json:"submitted_at"`
}

type PrCommentFields struct {
  GhId int64 `db:"gh_id" json:"gh_id"`
  AuthorLogin *string `db:"author_login" json:"author_login"`
  Body string `db:"body" json:"body"`
  Path *string `db:"path" json:"path"`
  Line *int64 `db:"line" json:"line"`
  InReplyToId *int64 `db:"in_reply_to_id" json:"in_reply_to_id"`
  CreatedAt string `db:"created_at" json:"created_at"`
  UpdatedAt string `db:"updated_at" json:"updated_at"`
}

type PrStatusCheckFields struct {
  Context string `db:"context" json:"context"`
  State string `db:"state" json:"state"`
  TargetUrl *string `db:"target_url" json:"target_url"`
  Description *string `db:"description" json:"description"`
  UpdatedAt *string `db:"updated_at" json:"updated_at"`
}

type RepoEventFields struct {
  GhId string `db:"gh_id" json:"gh_id"`
  Type string `db:"type" json:"type"`
  ActorLogin *string `db:"actor_login" json:"actor_login"`
  PayloadJson string `db:"payload_json" json:"payload_json"`
  CreatedAt string `db:"created_at" json:"created_at"`
}

type NotificationFields struct {
  GhId string `db:"gh_id" json:"gh_id"`
  SubjectType *string `db:"subject_type" json:"subject_type"`
  SubjectTitle *string `db:"subject_title" json:"subject_title"`
  SubjectUrl *string `db:"subject_url" json:"subject_url"`
  Reason string `db:"reason" json:"reason"`
  Unread bool `db:"unread" json:"unread"`
  UpdatedAt string `db:"updated_at" json:"updated_at"`
  LastReadAt *string `db:"last_read_at" json:"last_read_at"`
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

func UpsertPullRequest(ctx context.Context, db *sqlx.DB, repo_id int64, number int64, gh_node_id *string, state string, title string, author_login *string, head_ref *string, head_sha *string, base_ref *string, mergeable *string, is_draft bool, additions *int64, deletions *int64, changed_files *int64, created_at string, updated_at string, merged_at *string, closed_at *string, body *string) (int64, error) {
	query := `INSERT INTO pull_request
		(repo_id, number, gh_node_id, state, title, author_login, head_ref, head_sha, base_ref, mergeable, is_draft, additions, deletions, changed_files, created_at, updated_at, merged_at, closed_at, body)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, repo_id, number, gh_node_id, state, title, author_login, head_ref, head_sha, base_ref, mergeable, is_draft, additions, deletions, changed_files, created_at, updated_at, merged_at, closed_at, body).Scan(&id)
	return id, err
}

func UpsertPrReview(ctx context.Context, db *sqlx.DB, pr_id int64, gh_id int64, author_login *string, state string, body *string, submitted_at *string) (int64, error) {
	query := `INSERT INTO pr_review
		(pr_id, gh_id, author_login, state, body, submitted_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(pr_id, gh_id) DO UPDATE SET
			author_login = excluded.author_login,
			state = excluded.state,
			body = excluded.body,
			submitted_at = excluded.submitted_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, pr_id, gh_id, author_login, state, body, submitted_at).Scan(&id)
	return id, err
}

func UpsertPrComment(ctx context.Context, db *sqlx.DB, pr_id int64, gh_id int64, author_login *string, body string, path *string, line *int64, in_reply_to_id *int64, created_at string, updated_at string) (int64, error) {
	query := `INSERT INTO pr_comment
		(pr_id, gh_id, author_login, body, path, line, in_reply_to_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT(pr_id, gh_id) DO UPDATE SET
			author_login = excluded.author_login,
			body = excluded.body,
			path = excluded.path,
			line = excluded.line,
			in_reply_to_id = excluded.in_reply_to_id,
			created_at = excluded.created_at,
			updated_at = excluded.updated_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, pr_id, gh_id, author_login, body, path, line, in_reply_to_id, created_at, updated_at).Scan(&id)
	return id, err
}

func UpsertPrStatusCheck(ctx context.Context, db *sqlx.DB, pr_id int64, context string, state string, target_url *string, description *string, updated_at *string) (int64, error) {
	query := `INSERT INTO pr_status_check
		(pr_id, context, state, target_url, description, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(pr_id, context) DO UPDATE SET
			state = excluded.state,
			target_url = excluded.target_url,
			description = excluded.description,
			updated_at = excluded.updated_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, pr_id, context, state, target_url, description, updated_at).Scan(&id)
	return id, err
}

func UpsertPrLabel(ctx context.Context, db *sqlx.DB, pr_id int64, label string, color *string) (error) {
	query := `INSERT OR IGNORE INTO pr_label
		(pr_id, label, color)
		VALUES ($1, $2, $3)`
	_, err := db.ExecContext(ctx, query, pr_id, label, color)
	return err
}

func UpsertPrRequestedReviewer(ctx context.Context, db *sqlx.DB, pr_id int64, reviewer string) (error) {
	query := `INSERT OR IGNORE INTO pr_requested_reviewer
		(pr_id, reviewer)
		VALUES ($1, $2)`
	_, err := db.ExecContext(ctx, query, pr_id, reviewer)
	return err
}

func InsertRepoEvent(ctx context.Context, db *sqlx.DB, repo_id int64, gh_id string, type string, actor_login *string, payload_json string, created_at string) (error) {
	query := `INSERT OR IGNORE INTO repo_event
		(repo_id, gh_id, type, actor_login, payload_json, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := db.ExecContext(ctx, query, repo_id, gh_id, type, actor_login, payload_json, created_at)
	return err
}

func UpsertNotification(ctx context.Context, db *sqlx.DB, gh_id string, repo_id int64, subject_type *string, subject_title *string, subject_url *string, reason string, unread bool, updated_at string, last_read_at *string) (int64, error) {
	query := `INSERT INTO notification
		(gh_id, repo_id, subject_type, subject_title, subject_url, reason, unread, updated_at, last_read_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT(gh_id) DO UPDATE SET
			repo_id = excluded.repo_id,
			subject_type = excluded.subject_type,
			subject_title = excluded.subject_title,
			subject_url = excluded.subject_url,
			reason = excluded.reason,
			unread = excluded.unread,
			updated_at = excluded.updated_at,
			last_read_at = excluded.last_read_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, gh_id, repo_id, subject_type, subject_title, subject_url, reason, unread, updated_at, last_read_at).Scan(&id)
	return id, err
}

func UpsertCheckout(ctx context.Context, db *sqlx.DB, repo_id int64, branch string, local_path string, sha *string, checked_out_at string) (int64, error) {
	query := `INSERT INTO checkout
		(repo_id, branch, local_path, sha, checked_out_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT(repo_id, branch) DO UPDATE SET
			local_path = excluded.local_path,
			sha = excluded.sha,
			checked_out_at = excluded.checked_out_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, repo_id, branch, local_path, sha, checked_out_at).Scan(&id)
	return id, err
}

func UpsertCallLog(ctx context.Context, db *sqlx.DB, endpoint string, api_type string, method string, status_code *int64, etag *string, last_modified *string, rate_remaining *int64, rate_reset *int64, gql_cost *int64, cache_hit int64, duration_ms *int64, called_at string) (int64, error) {
	query := `INSERT INTO call_log
		(endpoint, api_type, method, status_code, etag, last_modified, rate_remaining, rate_reset, gql_cost, cache_hit, duration_ms, called_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, endpoint, api_type, method, status_code, etag, last_modified, rate_remaining, rate_reset, gql_cost, cache_hit, duration_ms, called_at).Scan(&id)
	return id, err
}

func UpsertChangeLog(ctx context.Context, db *sqlx.DB, entity_type string, entity_id int64, event string, repo_slug *string, payload_json *string, occurred_at string) (int64, error) {
	query := `INSERT INTO change_log
		(entity_type, entity_id, event, repo_slug, payload_json, occurred_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(id) DO UPDATE SET
			entity_type = excluded.entity_type,
			entity_id = excluded.entity_id,
			event = excluded.event,
			repo_slug = excluded.repo_slug,
			payload_json = excluded.payload_json,
			occurred_at = excluded.occurred_at
		RETURNING id`
	var id int64
	err := db.QueryRowContext(ctx, query, entity_type, entity_id, event, repo_slug, payload_json, occurred_at).Scan(&id)
	return id, err
}

func UpsertPollState(ctx context.Context, db *sqlx.DB, endpoint string, etag *string, last_modified *string, poll_interval *int64, last_polled_at *string, last_changed_at *string) (error) {
	query := `INSERT INTO poll_state
		(endpoint, etag, last_modified, poll_interval, last_polled_at, last_changed_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(endpoint) DO UPDATE SET
			etag = excluded.etag,
			last_modified = excluded.last_modified,
			poll_interval = excluded.poll_interval,
			last_polled_at = excluded.last_polled_at,
			last_changed_at = excluded.last_changed_at
	`
	_, err := db.ExecContext(ctx, query, endpoint, etag, last_modified, poll_interval, last_polled_at, last_changed_at)
	return err
}

// ExtractRepo extracts Repo fields from a GhRepo JSON value.
func ExtractRepo(src map[string]interface{}) RepoFields {
	return RepoFields{
		Owner: jsonString(dig(src, "owner", "login")),
		Name: jsonString(src["name"]),
		DefaultBranch: jsonString(dig(src, "defaultBranchRef", "name")),
	}
}

// ExtractBranch extracts Branch fields from a GhBranch JSON value.
func ExtractBranch(src map[string]interface{}) BranchFields {
	return BranchFields{
		Name: jsonString(src["name"]),
		Sha: jsonOptString(src["commit"]),
	}
}

// ExtractPullRequest extracts PullRequest fields from a GhPullRequest JSON value.
func ExtractPullRequest(src map[string]interface{}) PullRequestFields {
	return PullRequestFields{
		Number: jsonInt64(src["number"]),
		GhNodeId: jsonOptString(src["id"]),
		State: jsonString(src["state"]),
		Title: jsonString(src["title"]),
		AuthorLogin: jsonOptString(dig(src, "author", "login")),
		HeadRef: jsonOptString(src["headRefName"]),
		HeadSha: jsonOptString(src["headRefOid"]),
		BaseRef: jsonOptString(src["baseRefName"]),
		Mergeable: jsonOptString(src["mergeable"]),
		IsDraft: jsonBool(src["isDraft"]),
		Additions: jsonOptInt64(src["additions"]),
		Deletions: jsonOptInt64(src["deletions"]),
		ChangedFiles: jsonOptInt64(src["changedFiles"]),
		CreatedAt: jsonString(src["createdAt"]),
		UpdatedAt: jsonString(src["updatedAt"]),
		MergedAt: jsonOptString(src["mergedAt"]),
		ClosedAt: jsonOptString(src["closedAt"]),
		Body: jsonOptString(src["body"]),
	}
}

// ExtractPrReview extracts PrReview fields from a GhReview JSON value.
func ExtractPrReview(src map[string]interface{}) PrReviewFields {
	return PrReviewFields{
		GhId: jsonInt64(src["id"]),
		AuthorLogin: jsonOptString(dig(src, "author", "login")),
		State: jsonString(src["state"]),
		Body: jsonOptString(src["body"]),
		SubmittedAt: jsonOptString(src["submittedAt"]),
	}
}

// ExtractPrComment extracts PrComment fields from a GhPrComment JSON value.
func ExtractPrComment(src map[string]interface{}) PrCommentFields {
	return PrCommentFields{
		GhId: jsonInt64(src["id"]),
		AuthorLogin: jsonOptString(dig(src, "author", "login")),
		Body: jsonString(src["body"]),
		Path: jsonOptString(src["path"]),
		Line: jsonOptInt64(src["line"]),
		InReplyToId: jsonOptInt64(src["in_reply_to_id"]),
		CreatedAt: jsonString(src["created_at"]),
		UpdatedAt: jsonString(src["updated_at"]),
	}
}

// ExtractPrStatusCheck extracts PrStatusCheck fields from a GhStatusCheck JSON value.
func ExtractPrStatusCheck(src map[string]interface{}) PrStatusCheckFields {
	return PrStatusCheckFields{
		Context: jsonString(src["context"]),
		State: jsonString(src["state"]),
		TargetUrl: jsonOptString(src["target_url"]),
		Description: jsonOptString(src["description"]),
		UpdatedAt: jsonOptString(src["updated_at"]),
	}
}

// ExtractRepoEvent extracts RepoEvent fields from a GhRepoEvent JSON value.
func ExtractRepoEvent(src map[string]interface{}) RepoEventFields {
	return RepoEventFields{
		GhId: jsonString(src["id"]),
		Type: jsonString(src["type"]),
		ActorLogin: jsonOptString(dig(src, "actor", "login")),
		PayloadJson: jsonString(src["payload"]),
		CreatedAt: jsonString(src["created_at"]),
	}
}

// ExtractNotification extracts Notification fields from a GhNotification JSON value.
func ExtractNotification(src map[string]interface{}) NotificationFields {
	return NotificationFields{
		GhId: jsonString(src["id"]),
		SubjectType: jsonOptString(dig(src, "subject", "type")),
		SubjectTitle: jsonOptString(dig(src, "subject", "title")),
		SubjectUrl: jsonOptString(dig(src, "subject", "url")),
		Reason: jsonString(src["reason"]),
		Unread: jsonBool(src["unread"]),
		UpdatedAt: jsonString(src["updated_at"]),
		LastReadAt: jsonOptString(src["last_read_at"]),
	}
}
