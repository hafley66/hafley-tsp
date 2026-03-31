import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./repo.tsp";

using Entity;
using Rel;
using Bind;

model Notification {
  @Entity.pk id: integer;
  @Entity.unique(Notification.gh_id)
  gh_id: string;
  @Rel.belongsTo repo: Repo;
  `subject.type`: string | null;
  `subject.title`: string | null;
  `subject.url`: string | null;
  @Entity.manual subject_number: integer | null;
  @Entity.manual html_url: string | null;
  reason: string;
  unread: boolean;
  updated_at: string;
  last_read_at: string | null;

  @Entity.index(Notification.unread, Notification.updated_at)
  _idx_unread: never;
}

@Bind.from(GhNotification, Notification)
model NotificationBinding {
  gh_id: [GhNotification.id];
}
