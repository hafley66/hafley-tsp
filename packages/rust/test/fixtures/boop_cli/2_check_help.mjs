import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { commands, fixtureDir } from "./0_help_inputs.mjs";

const parity = fileURLToPath(new URL("parity", import.meta.url));
const output = process.env.BOOP_PARITY_OUTPUT ?? join(parity, "help-results");
const manifest = join(parity, "Cargo.toml");
if (!process.argv.includes("--no-build")) {
  const build = spawnSync("cargo", ["build", "--manifest-path", manifest, "--bin", "boop"], { env: { ...process.env, CARGO_BUILD_JOBS: "4" }, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
const metadata = spawnSync("cargo", ["metadata", "--manifest-path", manifest, "--no-deps", "--format-version", "1"], { encoding: "utf8" });
if (metadata.status !== 0) throw new Error(metadata.stderr);
const bin = process.env.BOOP_PARITY_BIN ?? join(JSON.parse(metadata.stdout).target_directory, "debug/boop");
mkdirSync(output, { recursive: true });
const results = commands.map(c => {
  const run = spawnSync(bin, [...c.path, "--help"], { env: { ...process.env, NO_COLOR: "1", TERM: "dumb" } });
  const expected = readFileSync(join(fixtureDir, c.file));
  const passed = run.status === 0 && run.stdout?.equals(expected);
  if (!passed) {
    writeFileSync(join(output, c.file), run.stdout ?? "");
    writeFileSync(join(output, c.file + ".stderr"), run.stderr ?? "");
    const diff = spawnSync("diff", ["-u", join(fixtureDir, c.file), join(output, c.file)], { encoding: "utf8" });
    writeFileSync(join(output, c.file + ".diff"), diff.stdout ?? "");
  }
  return { file: c.file, path: c.path, passed: !!passed, status: run.status };
});
writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2) + "\n");
const passed = results.filter(r => r.passed).length;
console.log(`help parity: ${passed}/${results.length}; results: ${output}`);
for (const r of results.filter(r => !r.passed)) console.log(`FAIL ${r.path.join(" ") || "boop"} (exit ${r.status})`);
process.exitCode = passed === results.length ? 0 : 1;
