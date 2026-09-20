/**
 * harness: Git's checkout identity, before the visual wrapper touches evidence.
 *
 * Bound: the CLI certifies only from the primary checkout root. A linked
 * worktree's ignored frames would disappear when that worktree is removed.
 * This protects the output location, not the later lifetime of primary output.
 */
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";

export function assertPrimaryVisualCheckout(cwd = process.cwd()): void {
  // The native resolver returns Windows' stored spelling. The JS resolver can
  // preserve a caller's alternate case and reject the same physical checkout.
  const directory = realpathSync.native(cwd);
  const git = (args: string[]): string => execFileSync(
    "git", ["-c", `safe.directory=${directory.replaceAll("\\", "/")}`, ...args],
    {
      cwd: directory,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10_000,
      stdio: ["ignore", "pipe", "pipe"],
      // Checkout identity comes from cwd, never from a parent Git invocation.
      env: { ...process.env, GIT_DIR: undefined, GIT_WORK_TREE: undefined, GIT_COMMON_DIR: undefined },
    },
  );
  let gitDirectory: string;
  let commonDirectory: string;
  let checkout: string;
  let primary: string;
  try {
    const paths = git(["rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir", "--show-toplevel"])
      .trim().split(/\r?\n/);
    if (paths.length !== 3) throw new Error("Git did not return three checkout paths.");
    [gitDirectory, commonDirectory, checkout] = paths.map((path) => realpathSync.native(path)) as [string, string, string];
    const entry = git(["worktree", "list", "--porcelain", "-z"]).split("\0")[0];
    if (!entry?.startsWith("worktree ")) throw new Error("Git did not name its primary checkout.");
    primary = realpathSync.native(entry.slice("worktree ".length));
  } catch (error) {
    throw new Error(
      `The visual gate cannot identify a primary Git checkout from ${directory}: ` +
        `${error instanceof Error ? error.message : String(error)}. Run \`npm run visual\` from the ` +
        "primary checkout root with Git available. No visual evidence was changed.",
    );
  }
  if (gitDirectory !== commonDirectory || directory !== checkout || directory !== primary) {
    throw new Error(
      `The visual gate refuses ${directory}: certificates and their ignored frames must survive ` +
        "linked-worktree removal. Integrate the reviewed candidate into the primary checkout, then " +
        `run \`npm run visual\` from ${resolve(primary)}. No visual evidence was changed.`,
    );
  }
}
