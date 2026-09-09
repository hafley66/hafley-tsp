import alloyPlugin from "@alloy-js/rollup-plugin";
import nodeResolve from "@rollup/plugin-node-resolve";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function walk(directory, results = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, results);
    else if (/\.(ts|tsx)$/.test(path) && !path.endsWith(".d.ts")) results.push(path);
  }
  return results;
}

const source = resolve("src");
const input = Object.fromEntries(walk(source).map((file) => [relative(source, file).replace(/\.(ts|tsx)$/, ""), file]));

export default {
  input,
  output: { dir: "dist/src", format: "esm", preserveModules: false, sourcemap: true, entryFileNames: "[name].js" },
  external: [
    "@alloy-js/core", "@alloy-js/core/jsx-runtime", "@hafley/alloy-rs", "@hafley/typespec-sql",
    "@typespec/compiler", "node:fs/promises", "node:path",
  ],
  plugins: [nodeResolve({ extensions: [".ts", ".tsx", ".js", ".jsx"] }), alloyPlugin()],
};
