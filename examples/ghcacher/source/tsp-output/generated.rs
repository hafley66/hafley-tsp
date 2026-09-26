// alloy-imports-start
use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::SqliteConnection;

// alloy-imports-end
// alloy-row-structs-start

// alloy-row-structs-end
// alloy-extraction-structs-start

// alloy-extraction-structs-end
// alloy-upsert-fns-start

// alloy-upsert-fns-end
// alloy-extract-fns-start

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

// Custom code below this line is preserved across re-generation.
