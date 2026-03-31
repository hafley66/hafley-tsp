import alloyPlugin from "@alloy-js/rollup-plugin";
import nodeResolve from "@rollup/plugin-node-resolve";
import { readdirSync, statSync } from "fs";
import { resolve, relative, join } from "path";

function walkDir(dir, ext, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkDir(full, ext, results);
    } else if (ext.some(e => full.endsWith(e)) && !full.includes(".test.") && !full.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = resolve("src");
const inputs = walkDir(srcDir, [".ts", ".tsx"]);

const input = {};
for (const file of inputs) {
  const rel = relative(srcDir, file).replace(/\.(ts|tsx)$/, "");
  input[rel] = file;
}

export default {
  input,
  output: {
    dir: "dist/src",
    format: "esm",
    preserveModules: false,
    sourcemap: true,
    entryFileNames: "[name].js",
  },
  external: [
    "@alloy-js/core",
    "@alloy-js/core/jsx-runtime",
    "@alloy-js/go",
    "@alloy-js/go/jsx-runtime",
    "@hafley/alloy-rs",
    "@hafley/typespec-decorator-def",
    "@typespec/compiler",
    "fs",
    "fs/promises",
    "path",
    "node:fs",
    "node:path",
  ],
  plugins: [
    nodeResolve({ extensions: [".ts", ".tsx", ".js", ".jsx"] }),
    alloyPlugin(),
  ],
};
