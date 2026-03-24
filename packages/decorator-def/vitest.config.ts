import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "preserve",
    sourcemap: "both",
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
  plugins: [alloyPlugin()],
});
