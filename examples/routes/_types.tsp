// Shared scalars, enums, and relation decorators
import "./_types.js";

scalar UserId extends string;
scalar TodoId extends string;
scalar ListId extends string;
scalar CommentId extends string;
scalar TagId extends string;
scalar OrgId extends string;

enum Priority { low; medium; high; urgent }
enum Status { pending; active; done; archived }
enum OrgRole { owner; admin; member; viewer }

// ── Relation decorators ──
// These annotate model properties to declare how entities relate.
// The route walker and emitters read these to determine:
//   - DB: FK columns, join tables, indexes
//   - Routes: which sub-resource and traversal endpoints to generate
//   - Queries: what joins are available, what can be expanded/included

extern dec belongsTo(target: unknown);       // FK lives on this model
extern dec hasMany(target: unknown);         // FK lives on the other model
extern dec hasOne(target: unknown);          // 1-1, FK lives on the other model
extern dec manyToMany(target: unknown);      // junction table
