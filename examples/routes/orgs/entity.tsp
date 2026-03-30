import "../_types.tsp";

model Org {
  id: OrgId;
  name: string;
  createdAt: utcDateTime;

  // 1-M: org has many members (users)
  @hasMany members: User[];
}
