/** Source models -- GitHub API wire format, camelCase preserved. */

model GhUser {
  login: string | null;
}

model GhRef {
  name: string | null;
  oid: string | null;
}

model GhReview {
  id: integer;
  author: GhUser;
  state: string;
  body: string | null;
  submittedAt: string | null;
}

model GhLabel {
  name: string;
  color: string | null;
}

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

model GhRepo {
  owner: GhUser;
  name: string;
  defaultBranchRef: GhRef;
}

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

model GhNotification {
  id: string;
  repository: GhNotificationRepository;
  subject: GhNotificationSubject;
  reason: string;
  unread: boolean;
  updated_at: string;
  last_read_at: string | null;
}

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

model GhStatusCheck {
  context: string;
  state: string;
  target_url: string | null;
  description: string | null;
  updated_at: string | null;
}

model GhRepoEvent {
  id: string;
  type: string;
  actor: GhUser;
  payload: string; // JSON blob
  created_at: string;
}
