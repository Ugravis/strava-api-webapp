import { defineConfig } from "tsup";

// ESM for the Next.js apps, CommonJS for NestJS.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});
