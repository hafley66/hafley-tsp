import { describe, it, expect } from "vitest";
import type { TypeDef } from "./0_types.js";
import { emitAll } from "./2_walk.js";
import { rustTarget } from "./3_rust.js";
import { jsonSchemaTarget } from "./4_json-schema.js";

// ── Shared test fixtures ──

const USER: TypeDef = {
  kind: "model",
  name: "User",
  fields: [
    { name: "id", type: { kind: "scalar", name: "int64" } },
    { name: "name", type: { kind: "scalar", name: "string" } },
    { name: "email", type: { kind: "scalar", name: "string" } },
    { name: "age", type: { kind: "scalar", name: "int32" }, optional: true },
  ],
};

const POST: TypeDef = {
  kind: "model",
  name: "BlogPost",
  doc: "A blog post with tags and metadata",
  fields: [
    { name: "id", type: { kind: "scalar", name: "int64" } },
    { name: "title", type: { kind: "scalar", name: "string" } },
    { name: "body", type: { kind: "scalar", name: "string" } },
    { name: "author", type: { kind: "model", name: "User" } },
    { name: "tags", type: { kind: "array", element: { kind: "scalar", name: "string" } } },
    { name: "created_at", type: { kind: "scalar", name: "utcDateTime" } },
    { name: "metadata", type: { kind: "map", key: { kind: "scalar", name: "string" }, value: { kind: "scalar", name: "string" } } },
    { name: "status", type: { kind: "enum", name: "PostStatus" }, optional: true },
  ],
};

const STATUS: TypeDef = {
  kind: "enum",
  name: "PostStatus",
  doc: "Publication status",
  members: [
    { name: "Draft" },
    { name: "Published" },
    { name: "Archived" },
  ],
};

const ALL_TYPES: TypeDef[] = [USER, POST, STATUS];

// ── Rust target ──

describe("rust target", () => {
  it("emits a simple model", () => {
    const [decl] = emitAll([USER], rustTarget);
    expect(decl.code).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      #[derive(Debug, Clone, Serialize, Deserialize)]
      pub struct User {
        pub id: i64,
        pub name: String,
        pub email: String,
        pub age: Option<i32>,
      }"
    `);
  });

  it("emits complex types (array, map, datetime, model ref)", () => {
    const [, post] = emitAll([USER, POST], rustTarget);
    expect(post.code).toMatchInlineSnapshot(`
      "use chrono::DateTime;
      use chrono::Utc;
      use serde::Deserialize;
      use serde::Serialize;
      use std::collections::HashMap;

      /// A blog post with tags and metadata
      #[derive(Debug, Clone, Serialize, Deserialize)]
      pub struct BlogPost {
        pub id: i64,
        pub title: String,
        pub body: String,
        pub author: User,
        pub tags: Vec<String>,
        pub created_at: DateTime<Utc>,
        pub metadata: HashMap<String, String>,
        pub status: Option<PostStatus>,
      }"
    `);
  });

  it("emits an enum", () => {
    const [decl] = emitAll([STATUS], rustTarget);
    expect(decl.code).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      /// Publication status
      #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
      pub enum PostStatus {
        Draft,
        Published,
        Archived,
      }"
    `);
  });

  it("handles all scalar types", () => {
    const ENTITY: TypeDef = {
      kind: "model",
      name: "Entity",
      fields: [
        { name: "id", type: { kind: "scalar", name: "uuid" } },
        { name: "price", type: { kind: "scalar", name: "decimal" } },
        { name: "count", type: { kind: "scalar", name: "integer" } },
        { name: "rating", type: { kind: "scalar", name: "float" } },
        { name: "modified_at", type: { kind: "scalar", name: "offsetDateTime" } },
        { name: "data", type: { kind: "scalar", name: "bytes" } },
      ],
    };
    const [decl] = emitAll([ENTITY], rustTarget);
    expect(decl.code).toMatchInlineSnapshot(`
      "use chrono::DateTime;
      use chrono::FixedOffset;
      use rust_decimal::Decimal;
      use serde::Deserialize;
      use serde::Serialize;
      use uuid::Uuid;

      #[derive(Debug, Clone, Serialize, Deserialize)]
      pub struct Entity {
        pub id: Uuid,
        pub price: Decimal,
        pub count: i64,
        pub rating: f64,
        pub modified_at: DateTime<FixedOffset>,
        pub data: Vec<u8>,
      }"
    `);
  });
});

// ── JSON Schema target ──

describe("json schema target", () => {
  it("emits a simple model", () => {
    const [decl] = emitAll([USER], jsonSchemaTarget);
    expect(decl).toMatchInlineSnapshot(`
      {
        "$id": "User",
        "properties": {
          "age": {
            "format": "int32",
            "type": "integer",
          },
          "email": {
            "type": "string",
          },
          "id": {
            "format": "int64",
            "type": "integer",
          },
          "name": {
            "type": "string",
          },
        },
        "required": [
          "id",
          "name",
          "email",
        ],
        "type": "object",
      }
    `);
  });

  it("emits complex types (array, map, $ref)", () => {
    const [, post] = emitAll([USER, POST], jsonSchemaTarget);
    expect(post).toMatchInlineSnapshot(`
      {
        "$id": "BlogPost",
        "description": "A blog post with tags and metadata",
        "properties": {
          "author": {
            "$ref": "#/$defs/User",
          },
          "body": {
            "type": "string",
          },
          "createdAt": {
            "format": "date-time",
            "type": "string",
          },
          "id": {
            "format": "int64",
            "type": "integer",
          },
          "metadata": {
            "additionalProperties": {
              "type": "string",
            },
            "type": "object",
          },
          "status": {
            "$ref": "#/$defs/PostStatus",
          },
          "tags": {
            "items": {
              "type": "string",
            },
            "type": "array",
          },
          "title": {
            "type": "string",
          },
        },
        "required": [
          "id",
          "title",
          "body",
          "author",
          "tags",
          "createdAt",
          "metadata",
        ],
        "type": "object",
      }
    `);
  });

  it("emits an enum", () => {
    const [decl] = emitAll([STATUS], jsonSchemaTarget);
    expect(decl).toMatchInlineSnapshot(`
      {
        "$id": "PostStatus",
        "description": "Publication status",
        "enum": [
          "Draft",
          "Published",
          "Archived",
        ],
        "type": "string",
      }
    `);
  });
});

// ── Same input, both targets ──

describe("dual emit", () => {
  it("same TypeDef[] produces valid output from both targets", () => {
    const rustDecls = emitAll(ALL_TYPES, rustTarget);
    const schemaDecls = emitAll(ALL_TYPES, jsonSchemaTarget);

    // Same number of declarations
    expect(rustDecls).toHaveLength(3);
    expect(schemaDecls).toHaveLength(3);

    // Rust: all produce code strings
    for (const d of rustDecls) {
      expect(typeof d.code).toBe("string");
      expect(d.code.length).toBeGreaterThan(0);
    }

    // JSON Schema: all produce objects with $id
    for (const d of schemaDecls) {
      expect(d.$id).toBeTruthy();
      expect(d.type).toBeTruthy();
    }
  });
});
