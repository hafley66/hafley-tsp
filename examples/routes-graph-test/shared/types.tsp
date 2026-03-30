import "./types.js";

scalar OrgId extends string;
scalar UserId extends string;
scalar TodoId extends string;
scalar TagId extends string;

extern dec belongsTo(target: unknown);
extern dec hasMany(target: unknown);
extern dec manyToMany(target: unknown);
