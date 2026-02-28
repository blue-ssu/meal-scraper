import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: false,
  external: ["axios", "cheerio", "openai"],
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
});
