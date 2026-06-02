import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp fmt --check",
    "*.{ts,tsx,js,mjs,cjs}": "vp lint",
  },
  pack: {
    hash: false,
    entry: {
      index: "./src/index.ts",
      "bin/cli": "./src/cli/index.ts",
    },
  },
  test: {
    include: ["src/**/*.test.ts", "integration-tests/**/*.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
