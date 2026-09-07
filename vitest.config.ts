import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the unit tests. The Playwright specs under tools/visual are driven by
    // `npm run visual`, and picking them up here would run a browser suite under
    // a runner that cannot start one.
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
