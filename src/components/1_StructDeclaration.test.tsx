import { List } from "@alloy-js/core";
import { describe, expect, it } from "vitest";
import { StructDeclaration, StructField, TupleStructDeclaration } from "./1_StructDeclaration.js";

describe("StructDeclaration", () => {
  it("unit struct (no body)", () => {
    expect(
      <StructDeclaration name="Foo" />
    ).toRenderTo("struct Foo;");
  });

  it("empty braced struct", () => {
    expect(
      <StructDeclaration name="Foo" braced />
    ).toRenderTo("struct Foo {}");
  });

  it("fields with types", () => {
    expect(
      <StructDeclaration name="Foo">
        <List hardline>
          <StructField name="bar" type="i32" />
          <StructField name="baz" type="String" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo {
        bar: i32,
        baz: String,
      }
    `);
  });

  it("pub fields", () => {
    expect(
      <StructDeclaration name="Foo">
        <List hardline>
          <StructField name="bar" type="i32" pub />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo {
        pub bar: i32,
      }
    `);
  });

  it("pub struct", () => {
    expect(
      <StructDeclaration name="Foo" pub />
    ).toRenderTo("pub struct Foo;");
  });

  it("derive attribute", () => {
    expect(
      <StructDeclaration name="Foo" derive={["Debug", "Clone"]}>
        <List hardline>
          <StructField name="x" type="i32" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      #[derive(Debug, Clone)]
      struct Foo {
        x: i32,
      }
    `);
  });

  it("generic type parameter", () => {
    expect(
      <StructDeclaration name="Foo" typeParams={[{ name: "T" }]}>
        <List hardline>
          <StructField name="bar" type="T" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo<T> {
        bar: T,
      }
    `);
  });

  it("generic with trait bounds", () => {
    expect(
      <StructDeclaration name="Foo" typeParams={[{ name: "T", bounds: ["Display", "Clone"] }]}>
        <List hardline>
          <StructField name="bar" type="T" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo<T: Display + Clone> {
        bar: T,
      }
    `);
  });

  it("lifetime parameter", () => {
    expect(
      <StructDeclaration name="Foo" lifetimes={[{ name: "a" }]}>
        <List hardline>
          <StructField name="bar" type="&'a str" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo<'a> {
        bar: &'a str,
      }
    `);
  });

  it("mixed lifetime + generic", () => {
    expect(
      <StructDeclaration
        name="Foo"
        lifetimes={[{ name: "a" }]}
        typeParams={[{ name: "T", bounds: ["'a"] }]}
      >
        <List hardline>
          <StructField name="bar" type="&'a T" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo<'a, T: 'a> {
        bar: &'a T,
      }
    `);
  });

  it("where clause", () => {
    expect(
      <StructDeclaration
        name="Foo"
        typeParams={[{ name: "T" }]}
        where={[{ target: "T", bounds: ["Serialize"] }]}
      >
        <List hardline>
          <StructField name="bar" type="T" />
        </List>
      </StructDeclaration>
    ).toRenderTo(`
      struct Foo<T>
      where
          T: Serialize,
       {
        bar: T,
      }
    `);
  });
});

describe("TupleStructDeclaration", () => {
  it("basic tuple struct", () => {
    expect(
      <TupleStructDeclaration name="Point" fields={["f64", "f64"]} />
    ).toRenderTo("struct Point(f64, f64);");
  });

  it("with derive", () => {
    expect(
      <TupleStructDeclaration name="Point" derive={["Debug"]} fields={["f64", "f64"]} />
    ).toRenderTo(`
      #[derive(Debug)]
      struct Point(f64, f64);
    `);
  });
});
