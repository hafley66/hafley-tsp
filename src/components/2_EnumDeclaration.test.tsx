import { List } from "@alloy-js/core";
import { describe, expect, it } from "vitest";
import { StructField } from "./1_StructDeclaration.js";
import {
  EnumDeclaration,
  UnitVariant,
  TupleVariant,
  StructVariant,
} from "./2_EnumDeclaration.js";

describe("EnumDeclaration", () => {
  it("unit variants", () => {
    expect(
      <EnumDeclaration name="Color">
        <List hardline>
          <UnitVariant name="Red" />
          <UnitVariant name="Green" />
          <UnitVariant name="Blue" />
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      enum Color {
        Red,
        Green,
        Blue,
      }
    `);
  });

  it("tuple variants", () => {
    expect(
      <EnumDeclaration name="Shape">
        <List hardline>
          <TupleVariant name="Circle" fields={["f64"]} />
          <TupleVariant name="Rect" fields={["f64", "f64"]} />
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      enum Shape {
        Circle(f64),
        Rect(f64, f64),
      }
    `);
  });

  it("struct variants", () => {
    expect(
      <EnumDeclaration name="Message">
        <List hardline>
          <UnitVariant name="Quit" />
          <StructVariant name="Move">
            <List hardline>
              <StructField name="x" type="i32" />
              <StructField name="y" type="i32" />
            </List>
          </StructVariant>
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      enum Message {
        Quit,
        Move {
          x: i32,
          y: i32,
        },
      }
    `);
  });

  it("mixed variant types", () => {
    expect(
      <EnumDeclaration name="Event">
        <List hardline>
          <UnitVariant name="None" />
          <TupleVariant name="Click" fields={["i32", "i32"]} />
          <StructVariant name="KeyPress">
            <List hardline>
              <StructField name="key" type="char" />
              <StructField name="ctrl" type="bool" />
            </List>
          </StructVariant>
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      enum Event {
        None,
        Click(i32, i32),
        KeyPress {
          key: char,
          ctrl: bool,
        },
      }
    `);
  });

  it("derive attribute", () => {
    expect(
      <EnumDeclaration name="Color" derive={["Debug", "PartialEq"]}>
        <List hardline>
          <UnitVariant name="Red" />
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      #[derive(Debug, PartialEq)]
      enum Color {
        Red,
      }
    `);
  });

  it("generic enum", () => {
    expect(
      <EnumDeclaration name="Option" typeParams={[{ name: "T" }]}>
        <List hardline>
          <TupleVariant name="Some" fields={["T"]} />
          <UnitVariant name="None" />
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      enum Option<T> {
        Some(T),
        None,
      }
    `);
  });

  it("pub enum", () => {
    expect(
      <EnumDeclaration name="Color" pub>
        <List hardline>
          <UnitVariant name="Red" />
        </List>
      </EnumDeclaration>
    ).toRenderTo(`
      pub enum Color {
        Red,
      }
    `);
  });
});
