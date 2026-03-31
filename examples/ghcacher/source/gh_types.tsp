/** Source models -- GitHub API wire format, camelCase preserved. */
import "../../../packages/binding-core/lib/main.tsp";

using Source;

model GhUser {
  login: string | null;
}

model GhRef {
  name: string | null;
  oid: string | null;
}

@Source.graphql
@Source.nested(GhPullRequest, "reviews.nodes")
model GhReview {
  id: integer;
  author: GhUser;
  state: string;
  body: string | null;
  submittedAt: string | null;
}

@Source.nested(GhPullRequest, "labels.nodes")
model GhLabel {
  name: string;
  color: string | null;
}

@Source.graphql
model GhPullRequest {
  id: string;
  number: integer;
  title: string;
  state: string;
  isDraft: boolean;
  author: GhUser;
  headRefName: string | null;
  headRefOid: string | null;
  baseRefName: string | null;
  mergeable: string | null;
  additions: integer | null;
  deletions: integer | null;
  changedFiles: integer | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  body: string | null;
}

@Source.rest("/orgs/{owner}/repos")
@Source.paginated
model GhRepo {
  owner: GhUser;
  name: string;
  defaultBranchRef: GhRef;
}

@Source.rest("/repos/{owner}/{name}/branches")
@Source.paginated
model GhBranch {
  name: string;
  commit: { sha: string | null };
}

model GhNotificationSubject {
  type: string;
  title: string;
  url: string | null;
}

model GhNotificationRepository {
  owner: GhUser;
  name: string;
}

@Source.nested(GhPullRequest, "reviewRequests.nodes")
model GhRequestedReviewer {
  requestedReviewer: { login: string | null; name: string | null };
}

@Source.rest("/notifications")
@Source.freshness("last-modified")
model GhNotification {
  id: string;
  repository: GhNotificationRepository;
  subject: GhNotificationSubject;
  reason: string;
  unread: boolean;
  updated_at: string;
  last_read_at: string | null;
}

@Source.graphql
@Source.nested(GhPullRequest, "comments.nodes")
model GhPrComment {
  id: integer;
  author: GhUser;
  body: string;
  path: string | null;
  line: integer | null;
  in_reply_to_id: integer | null;
  created_at: string;
  updated_at: string;
}

@Source.graphql
@Source.nested(GhPullRequest, "commits.nodes[0].commit.statusCheckRollup.contexts.nodes")
model GhStatusCheck {
  context: string;
  state: string;
  target_url: string | null;
  description: string | null;
  updated_at: string | null;
}

@Source.rest("/repos/{owner}/{name}/events")
@Source.paginated
@Source.pollInterval(60)
model GhRepoEvent {
  id: string;
  type: string;
  actor: GhUser;
  payload: string; // JSON blob
  created_at: string;
}
