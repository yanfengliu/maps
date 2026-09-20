/**
 * harness: the real visual CLI and Git's primary/linked checkout metadata.
 *
 * Bound: all three CLI steps reject a disposable linked checkout before changing
 * evidence; primary roots are admitted and subdirectories/non-repositories are
 * refused. No browser, GPU, scene or successful certificate is fabricated here.
 * Removing the CLI guard must make the linked-checkout control fail.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertPrimaryVisualCheckout } from "../tools/visual/checkout.js";

describe("visual evidence stays in the primary checkout", () => {
  let fixture: string;
  let primary: string;
  let linked: string;
  const wrapper = resolve("tools/visual/verify-output.ts");
  const git = (args: string[]): void => {
    execFileSync("git", ["-c", `safe.directory=${primary.replaceAll("\\", "/")}`, ...args], {
      cwd: primary, windowsHide: true, stdio: "pipe", timeout: 10_000,
    });
  };

  beforeAll(async () => {
    fixture = await mkdtemp(join(tmpdir(), "maps-visual-checkout-"));
    primary = join(fixture, "Primary With Spaces");
    linked = join(fixture, "linked");
    await mkdir(primary);
    git(["init", "--quiet"]);
    git(["-c", "user.name=Visual fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "--allow-empty", "-m", "fixture"]);
    git(["worktree", "add", "--quiet", "--detach", linked]);
  });

  afterAll(async () => {
    // This fixture contains no junctions or symlinks; only these temporary Git
    // checkouts belong to the test. No real worktree is removed.
    if (fixture) await rm(fixture, { recursive: true, force: true });
  });

  it("admits the primary checkout root", () => {
    expect(() => assertPrimaryVisualCheckout(primary)).not.toThrow();
  });

  it("lets the primary CLI reset its own evidence", async () => {
    const output = join(primary, "artifacts", "visual");
    await mkdir(output, { recursive: true });
    await writeFile(join(output, "complete.json"), "previous certificate");
    await writeFile(join(output, "run.json"), "previous run");
    const result = spawnSync(process.execPath, [wrapper, "--reset"], {
      cwd: primary, encoding: "utf8", windowsHide: true, timeout: 15_000,
      env: { ...process.env, MAPS_VISUAL_LANE: "verdict" },
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    await expect(readFile(join(output, "complete.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(output, "run.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.runIf(process.platform === "win32")("admits the same primary with alternate Windows path casing", async () => {
    const alternate = primary.toLowerCase();
    expect(alternate).not.toBe(primary);
    expect(() => assertPrimaryVisualCheckout(alternate)).not.toThrow();
    const output = join(primary, "artifacts", "visual");
    await mkdir(output, { recursive: true });
    await writeFile(join(output, "complete.json"), "previous certificate");
    const result = spawnSync(process.execPath, [wrapper, "--reset"], {
      cwd: alternate, encoding: "utf8", windowsHide: true, timeout: 15_000,
      env: { ...process.env, MAPS_VISUAL_LANE: "verdict" },
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    await expect(readFile(join(output, "complete.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses primary subdirectories and names the root to run from", async () => {
    const child = join(primary, "child");
    await mkdir(child);
    expect(() => assertPrimaryVisualCheckout(child)).toThrow(primary);
  });

  it("refuses a directory outside any Git checkout with the missing prerequisite", () => {
    expect(() => assertPrimaryVisualCheckout(fixture)).toThrow(/primary Git checkout[\s\S]*npm run visual/);
  });

  for (const phase of ["reset", "begin", "end"] as const) {
    it(`refuses --${phase} in a linked worktree before changing either checkout's evidence`, async () => {
      for (const checkout of [primary, linked]) {
        const output = join(checkout, "artifacts", "visual");
        await mkdir(output, { recursive: true });
        await writeFile(join(output, "complete.json"), "retained certificate");
        await writeFile(join(output, "run.json"), "retained run");
      }
      const result = spawnSync(process.execPath, [wrapper, `--${phase}`], {
        cwd: linked, encoding: "utf8", windowsHide: true, timeout: 15_000,
        env: { ...process.env, MAPS_VISUAL_LANE: "verdict" },
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("certificates and their ignored frames must survive linked-worktree removal");
      expect(result.stderr).toContain(primary);
      expect(result.stderr).toContain("npm run visual");
      for (const checkout of [primary, linked]) {
        const output = join(checkout, "artifacts", "visual");
        expect(await readFile(join(output, "complete.json"), "utf8")).toBe("retained certificate");
        expect(await readFile(join(output, "run.json"), "utf8")).toBe("retained run");
      }
    });
  }
});
