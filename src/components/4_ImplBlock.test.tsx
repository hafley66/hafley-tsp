import { List } from "@alloy-js/core";
import { describe, expect, it } from "vitest";
import { FunctionDeclaration } from "./3_FunctionDeclaration.js";
import { ImplBlock } from "./4_ImplBlock.js";

describe("ImplBlock", () => {
  it("inherent impl, empty", () => {
    expect(
      <ImplBlock target="Foo" />
    ).toRenderTo("impl Foo { }");
  });

  it("inherent impl with method", () => {
    expect(
      <ImplBlock target="Foo">
        <FunctionDeclaration name="bar" pub>
          42
        </FunctionDeclaration>
      </ImplBlock>
    ).toRenderTo(`
      impl Foo {
        pub fn bar() {
          42
        }
      }
    `);
  });

  it("trait impl", () => {
    expect(
      <ImplBlock target="Foo" trait="Display">
        <FunctionDeclaration
          name="fmt"
          params={[
            { name: "&self", type: "" },
            { name: "f", type: "&mut fmt::Formatter<'_>" },
          ]}
          returns="fmt::Result"
        >
          write!(f, "Foo")
        </FunctionDeclaration>
      </ImplBlock>
    ).toRenderTo(`
      impl Display for Foo {
        fn fmt(&self: , f: &mut fmt::Formatter<'_>) -> fmt::Result {
          write!(f, "Foo")
        }
      }
    `);
  });

  it("generic impl", () => {
    expect(
      <ImplBlock target="Foo<T>" typeParams={[{ name: "T" }]} />
    ).toRenderTo("impl<T> Foo<T> { }");
  });

  it("impl with where clause", () => {
    expect(
      <ImplBlock
        target="Foo<T>"
        typeParams={[{ name: "T" }]}
        where={[{ target: "T", bounds: ["Clone"] }]}
      />
    ).toRenderTo(`
      impl<T> Foo<T>
      where
          T: Clone,
       { }
    `);
  });

  it("multiple impl blocks for same type", () => {
    expect(
      <>
        <ImplBlock target="Foo">
          <FunctionDeclaration name="new" returns="Self">
            todo!()
          </FunctionDeclaration>
        </ImplBlock>
        {"\n\n"}
        <ImplBlock target="Foo" trait="Default">
          <FunctionDeclaration name="default" returns="Self">
            todo!()
          </FunctionDeclaration>
        </ImplBlock>
      </>
    ).toRenderTo(`
      impl Foo {
        fn new() -> Self {
          todo!()
        }
      }

      impl Default for Foo {
        fn default() -> Self {
          todo!()
        }
      }
    `);
  });

  it("trait impl with generics on both", () => {
    expect(
      <ImplBlock
        target="Vec<T>"
        trait="From<T>"
        typeParams={[{ name: "T" }]}
      >
        <FunctionDeclaration
          name="from"
          params={[{ name: "item", type: "T" }]}
          returns="Self"
        >
          vec![item]
        </FunctionDeclaration>
      </ImplBlock>
    ).toRenderTo(`
      impl<T> From<T> for Vec<T> {
        fn from(item: T) -> Self {
          vec![item]
        }
      }
    `);
  });
});
