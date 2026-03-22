import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Output, render } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { TsReplaceFile, AutoZone, ManualZone } from "./03_replace-region.js";

function findFile(node: any, path: string): any {
  if (!node.contents) return null;
  for (const item of node.contents) {
    if (item.kind === "file" && item.path === path) return item;
    if (item.kind === "directory") {
      const found = findFile(item, path);
      if (found) return found;
    }
  }
  return null;
}

function renderTsFile(jsx: any): any {
  return render(
    <Output>
      <ts.PackageDirectory name="test" version="0.1.0">
        {jsx}
      </ts.PackageDirectory>
    </Output>
  );
}

describe("TsReplaceFile", () => {
  it("first emit: builds file with sigils and manual scaffold", () => {
    const res = renderTsFile(
      <TsReplaceFile path="test.tsx">
        <AutoZone id="auto">generated content</AutoZone>
        <ManualZone>manual scaffold</ManualZone>
      </TsReplaceFile>
    );

    const file = findFile(res, "test.tsx");
    expect(file).not.toBeNull();
    expect(file.contents).toMatchSnapshot();
  });

  it("first emit: multiple auto zones", () => {
    const res = renderTsFile(
      <TsReplaceFile path="multi.tsx">
        <AutoZone id="imports">import line</AutoZone>
        <AutoZone id="state">state content</AutoZone>
        <ManualZone>manual body</ManualZone>
      </TsReplaceFile>
    );

    const file = findFile(res, "multi.tsx");
    expect(file).not.toBeNull();
    expect(file.contents).toMatchSnapshot();
  });

  it("re-emit: replaces auto zone, preserves manual code", () => {
    // Write an "existing" file with sigils and manual code
    const existingPath = join(tmpdir(), `test-reemit-${Date.now()}.tsx`);
    writeFileSync(existingPath, [
      "// alloy-auto-start",
      "old generated code",
      "// alloy-auto-end",
      "",
      "// user wrote this by hand",
      "export function MyComponent() {",
      "  return <div>custom</div>;",
      "}",
    ].join("\n"), "utf-8");

    try {
      const res = renderTsFile(
        <TsReplaceFile path="test.tsx" existingFile={existingPath}>
          <AutoZone id="auto">new generated code</AutoZone>
        </TsReplaceFile>
      );

      const file = findFile(res, "test.tsx");
      expect(file).not.toBeNull();
      expect(file.contents).toMatchSnapshot();
    } finally {
      if (existsSync(existingPath)) unlinkSync(existingPath);
    }
  });

  it("re-emit: preserves multiple manual sections between zones", () => {
    const existingPath = join(tmpdir(), `test-multi-${Date.now()}.tsx`);
    writeFileSync(existingPath, [
      "header manual code",
      "// alloy-imports-start",
      "old imports",
      "// alloy-imports-end",
      "middle manual code",
      "// alloy-state-start",
      "old state",
      "// alloy-state-end",
      "footer manual code",
    ].join("\n"), "utf-8");

    try {
      const res = renderTsFile(
        <TsReplaceFile path="test.tsx" existingFile={existingPath}>
          <AutoZone id="imports">new imports</AutoZone>
          <AutoZone id="state">new state</AutoZone>
        </TsReplaceFile>
      );

      const file = findFile(res, "test.tsx");
      expect(file).not.toBeNull();
      expect(file.contents).toMatchSnapshot();
    } finally {
      if (existsSync(existingPath)) unlinkSync(existingPath);
    }
  });

  it("re-emit: missing file falls back to first-emit mode", () => {
    const res = renderTsFile(
      <TsReplaceFile path="test.tsx" existingFile="/nonexistent/path.tsx">
        <AutoZone id="auto">generated</AutoZone>
        <ManualZone>scaffold</ManualZone>
      </TsReplaceFile>
    );

    const file = findFile(res, "test.tsx");
    expect(file).not.toBeNull();
    expect(file.contents).toMatchSnapshot();
  });
});
