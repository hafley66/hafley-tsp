import { describe, expect, it } from "vitest";
import { FunctionDeclaration } from "./3_FunctionDeclaration.js";

describe("FunctionDeclaration", () => {
  it("no params, no return", () => {
    expect(
      <FunctionDeclaration name="foo" />
    ).toRenderTo("fn foo() { }");
  });

  it("params with types", () => {
    expect(
      <FunctionDeclaration
        name="foo"
        params={[
          { name: "bar", type: "i32" },
          { name: "baz", type: "String" },
        ]}
      />
    ).toRenderTo("fn foo(bar: i32, baz: String) { }");
  });

  it("return type", () => {
    expect(
      <FunctionDeclaration name="foo" returns="i32" />
    ).toRenderTo("fn foo() -> i32 { }");
  });

  it("body content", () => {
    expect(
      <FunctionDeclaration name="foo" returns="i32">
        42
      </FunctionDeclaration>
    ).toRenderTo(`
      fn foo() -> i32 {
        42
      }
    `);
  });

  it("generic", () => {
    expect(
      <FunctionDeclaration
        name="foo"
        typeParams={[{ name: "T" }]}
        params={[{ name: "bar", type: "T" }]}
        returns="T"
      />
    ).toRenderTo("fn foo<T>(bar: T) -> T { }");
  });

  it("trait bounds", () => {
    expect(
      <FunctionDeclaration
        name="foo"
        typeParams={[{ name: "T", bounds: ["Display"] }]}
        params={[{ name: "bar", type: "T" }]}
      />
    ).toRenderTo("fn foo<T: Display>(bar: T) { }");
  });

  it("where clause", () => {
    expect(
      <FunctionDeclaration
        name="foo"
        typeParams={[{ name: "T" }]}
        params={[{ name: "bar", type: "T" }]}
        where={[{ target: "T", bounds: ["Serialize"] }]}
      />
    ).toRenderTo(`
      fn foo<T>(bar: T)
      where
          T: Serialize,
       { }
    `);
  });

  it("lifetime params", () => {
    expect(
      <FunctionDeclaration
        name="foo"
        lifetimes={[{ name: "a" }]}
        params={[{ name: "bar", type: "&'a str" }]}
        returns="&'a str"
      />
    ).toRenderTo("fn foo<'a>(bar: &'a str) -> &'a str { }");
  });

  it("pub visibility", () => {
    expect(
      <FunctionDeclaration name="foo" pub />
    ).toRenderTo("pub fn foo() { }");
  });

  it("async", () => {
    expect(
      <FunctionDeclaration name="foo" async />
    ).toRenderTo("async fn foo() { }");
  });

  it("pub async with everything", () => {
    expect(
      <FunctionDeclaration
        name="fetch"
        pub
        async
        typeParams={[{ name: "T", bounds: ["DeserializeOwned"] }]}
        params={[{ name: "url", type: "&str" }]}
        returns="Result<T>"
      >
        todo!()
      </FunctionDeclaration>
    ).toRenderTo(`
      pub async fn fetch<T: DeserializeOwned>(url: &str) -> Result<T> {
        todo!()
      }
    `);
  });
});
