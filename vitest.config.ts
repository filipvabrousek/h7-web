import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config for the h7-web test suite.
 *
 * - `environment: "jsdom"` because `level-engine.ts` reads
 *   `localStorage.h7_extended_staircase` via `isExtendedStaircase()` to decide
 *   whether the H8–H14 ladder is enabled. Node alone has no `localStorage`,
 *   which would force every test into the H1–H7 range and break parity with
 *   the iOS fixtures (those run with the extended ladder enabled by default
 *   in `LevelEngineFixtureTests.setUp`).
 * - `setupFiles` flips the localStorage flag once per worker so individual
 *   tests don't have to.
 * - The `@/` alias mirrors `tsconfig.json` so test files can use the same
 *   import paths as production code.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
