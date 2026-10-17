/** Bound: actual installed Playwright option validation and all capture config
 * imports in fresh Node children. Browser/server creation is trapped, never run.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { assertHeadlessEnvironment } from "../tools/visual/headless-environment.js";

const aliases = ["PWDEBUG", "npm_config_pwdebug", "npm_package_config_pwdebug"] as const;
const root = fileURLToPath(new URL("../", import.meta.url));
const core = createRequire(import.meta.url).resolve("playwright-core/lib/coreBundle");
const configs = [
  "playwright.config.ts", "playwright.lifecycle.config.ts", "playwright.frame-budget.config.ts",
  "playwright.flythrough.config.ts", "playwright.populated.config.ts", "playwright.render-defects.config.ts",
  "playwright.render-state.config.ts", "playwright.smoke.config.ts", "playwright.style-ui.config.ts",
  "tools/flicker/playwright.config.ts", "tools/paint-review/playwright.config.ts", "tools/post-chain/playwright.config.ts",
];

interface Observation {
  debugMode: string;
  headless: boolean;
  browsers: number;
  resourceCalls: string[];
  before: Record<string, string | null>;
  after: Record<string, string | null>;
  configs: { path: string; admitted: boolean; error?: string }[];
}

function installedAndConfigs(environment: Record<string, string>): Observation {
  // The package snapshots PWDEBUG at import, so each row needs a fresh child.
  const childEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !aliases.some(alias => alias.toLowerCase() === key.toLowerCase()),
  ));
  Object.assign(childEnvironment, environment, { NODE_DISABLE_COMPILE_CACHE: "1" });
  const source = `
    const cp = require('node:child_process');
    const { registerHooks, syncBuiltinESMExports } = require('node:module');
    const resourceCalls = [];
    for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
      cp[name] = () => { resourceCalls.push(name); throw Error('Config import attempted child resource ' + name); };
    }
    syncBuiltinESMExports();
    // Native Node strips TS but does not map the repo's bundler .js imports.
    // Resolve only an actually missing relative .js to its existing .ts sibling.
    registerHooks({ resolve(specifier, context, next) {
      try { return next(specifier, context); } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && specifier.endsWith('.js'))
          return next(specifier.slice(0, -3) + '.ts', context);
        throw error;
      }
    } });
    (async () => {
      const aliases = ${JSON.stringify(aliases)};
      const snapshot = () => Object.fromEntries(aliases.map(key => [key, process.env[key] ?? null]));
      const before = snapshot();
      const { server, utils } = require(${JSON.stringify(core)});
      const playwright = server.createPlaywright({ sdkLanguage: 'javascript', isInternalPlaywright: true });
      const headless = playwright.chromium._validateLaunchOptions({ headless: true }).headless;
      const configs = [];
      for (const path of ${JSON.stringify(configs)}) {
        try { await import(new URL(path, ${JSON.stringify(pathToFileURL(root).href)}).href); configs.push({ path, admitted: true }); }
        catch (error) { configs.push({ path, admitted: false, error: error.message }); }
      }
      console.log(JSON.stringify({ debugMode: utils.debugMode(), headless, browsers: playwright.allBrowsers().length,
        resourceCalls, before, after: snapshot(), configs }));
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const before = { ...childEnvironment };
  const result = spawnSync(process.execPath, ["--input-type=commonjs", "-e", source], {
    cwd: root, env: childEnvironment, encoding: "utf8", windowsHide: true, timeout: 15_000,
  });
  expect(childEnvironment).toEqual(before);
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  const observation = JSON.parse(result.stdout.trim()) as Observation;
  const evidence = process.env["MAPS_HEADLESS_TEST_EVIDENCE"];
  if (evidence) writeFileSync(join(evidence, `child-${result.pid}.json`), JSON.stringify({ pid: result.pid, status: result.status, environment, ...observation }, null, 2) + "\n", { flag: "wx" });
  return observation;
}

describe("headless capture environment admission", () => {
  it("keeps Playwright's first-defined precedence and exact safe values without changing inputs", () => {
    const inherited = Object.fromEntries(aliases.map(key => [key, process.env[key]]));
    for (const key of aliases) {
      for (const value of ["", "0", "false", "console"]) {
        const environment = Object.freeze({ [key]: value });
        expect(() => assertHeadlessEnvironment(environment)).not.toThrow();
        expect(environment).toEqual({ [key]: value });
      }
      for (const value of ["1", "inspector", "true", "False", " "]) {
        expect(() => assertHeadlessEnvironment(Object.freeze({ [key]: value }))).toThrow(`effective ${key}=${JSON.stringify(value)}`);
      }
    }
    expect(() => assertHeadlessEnvironment({})).not.toThrow();
    expect(() => assertHeadlessEnvironment({ PWDEBUG: "", npm_config_pwdebug: "1" })).not.toThrow();
    expect(() => assertHeadlessEnvironment({ PWDEBUG: "false", npm_config_pwdebug: "1" })).not.toThrow();
    expect(() => assertHeadlessEnvironment({ npm_config_pwdebug: "console", npm_package_config_pwdebug: "1" })).not.toThrow();
    expect(Object.fromEntries(aliases.map(key => [key, process.env[key]]))).toEqual(inherited);
  });

  const cases: { name: string; environment: Record<string, string>; headless: boolean; effective?: string; mode: string }[] = [
    ...aliases.map(key => ({ name: `${key} inspector`, environment: { [key]: "1" }, headless: false, effective: key, mode: "inspector" })),
    { name: "absent debug", environment: {}, headless: true, mode: "" },
    { name: "empty masks lower alias", environment: { PWDEBUG: "", npm_config_pwdebug: "1" }, headless: true, mode: "" },
    { name: "zero masks lower alias", environment: { PWDEBUG: "0", npm_config_pwdebug: "1" }, headless: true, mode: "" },
    { name: "false masks lower alias", environment: { PWDEBUG: "false", npm_config_pwdebug: "1" }, headless: true, mode: "" },
    { name: "console masks lower alias", environment: { npm_config_pwdebug: "console", npm_package_config_pwdebug: "1" }, headless: true, mode: "console" },
    { name: "first inspector beats lower false", environment: { PWDEBUG: "inspector", npm_config_pwdebug: "false" }, headless: false, effective: "PWDEBUG", mode: "inspector" },
  ];
  for (const row of cases) it(`binds every config to installed Playwright: ${row.name}`, () => {
    const actual = installedAndConfigs(row.environment);
    expect(actual.debugMode).toBe(row.mode);
    expect(actual.headless, "installed validator must expose the real explicit-headless override").toBe(row.headless);
    expect(actual.configs.map(config => config.path)).toEqual(configs);
    for (const config of actual.configs) {
      expect(config.admitted, config.path + ": " + (config.error ?? "admitted")).toBe(row.headless);
      if (!row.headless) {
        expect(config.error).toContain(`effective ${row.effective}=`);
        expect(config.error).toContain("Clear PWDEBUG, npm_config_pwdebug and npm_package_config_pwdebug");
      }
    }
    expect(actual.before).toEqual(actual.after);
    expect(actual.resourceCalls).toEqual([]);
    expect(actual.browsers).toBe(0);
  }, 20_000);
});
