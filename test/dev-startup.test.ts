/**
 * Bound: real Vite dependency scanning, Chokidar watch membership and source HMR
 * over a Node WebSocket; no browser, full application scene or renderer.
 */
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type InlineConfig, type ViteDevServer } from "vite";
import appConfig from "../vite.config.ts";

const servers: ViteDevServer[] = [];
const sockets: WebSocket[] = [];
const roots: string[] = [];
const tempParent = path.resolve(tmpdir());
const tempPrefix = "maps-dev-startup-";

type Message = Record<string, unknown>;

async function fixture(): Promise<{ root: string; cache: string }> {
  const root = fs.mkdtempSync(path.join(tempParent, tempPrefix));
  const cache = fs.mkdtempSync(path.join(tempParent, `${tempPrefix}cache-`));
  roots.push(root, cache);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
  for (const name of ["entry-probe", "artifact-only-probe"]) {
    const directory = path.join(root, "node_modules", name);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({
      name,
      version: "1.0.0",
      type: "module",
      exports: "./index.js",
    }));
    fs.writeFileSync(path.join(directory, "index.js"), `export const value = ${JSON.stringify(name)};\n`);
  }
  fs.writeFileSync(path.join(root, "index.html"), '<!doctype html><script type="module" src="/src/main.ts"></script>\n');
  fs.writeFileSync(path.join(root, "src/main.ts"), 'import { value } from "entry-probe";\nif (import.meta.hot) import.meta.hot.accept();\nconsole.log(value, "version-1");\n');
  fs.writeFileSync(path.join(root, "artifacts/retained.html"), '<!doctype html><script type="module" src="/artifacts/retained.ts"></script>\n');
  fs.writeFileSync(path.join(root, "artifacts/retained.ts"), 'import { value } from "artifact-only-probe";\nconsole.log(value);\n');
  return { root, cache };
}

function serverConfig(root: string, cacheDir: string, baseline: boolean): InlineConfig {
  const { optimizeDeps: _candidateOptimizeDeps, server: _candidateServer, ...shared } = appConfig;
  const server = baseline
    ? { host: "127.0.0.1", port: 0, strictPort: false }
    : { ...appConfig.server, host: "127.0.0.1", port: 0, strictPort: false };
  return {
    ...shared,
    configFile: false,
    root,
    cacheDir,
    logLevel: "silent",
    optimizeDeps: baseline ? { force: true } : { ...appConfig.optimizeDeps, force: true },
    server,
  };
}

function watchedFiles(server: ViteDevServer): Set<string> {
  const files = new Set<string>();
  for (const [directory, names] of Object.entries(server.watcher.getWatched())) {
    for (const name of names) files.add(path.resolve(directory, name));
  }
  return files;
}

async function waitFor<T>(label: string, read: () => T | undefined, timeoutMs = 8_000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}; the startup check did not run to completion.`);
}

function nextSocketMessage(socket: WebSocket, predicate: (message: Message) => boolean, timeoutMs = 10_000): Promise<Message> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("error", onError);
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Timed out waiting for a real Vite HMR WebSocket message.")); }, timeoutMs);
    const onError = (): void => { cleanup(); reject(new Error("The Vite HMR WebSocket failed before the expected message.")); };
    const onMessage = (event: MessageEvent): void => {
      void (async () => {
        try {
          const raw = typeof event.data === "string" ? event.data : await event.data.text();
          const message = JSON.parse(raw) as Message;
          if (predicate(message)) { cleanup(); resolve(message); }
        } catch (error) { cleanup(); reject(error); }
      })();
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", onError);
  });
}

async function startServer(root: string, cacheDir: string, baseline: boolean): Promise<ViteDevServer> {
  const server = await createServer(serverConfig(root, cacheDir, baseline));
  servers.push(server);
  const watcherReady = new Promise<void>(resolve => server.watcher.once("ready", resolve));
  await server.listen();
  await watcherReady;
  return server;
}

async function dependencyNames(server: ViteDevServer): Promise<string[]> {
  const optimizer = server.environments.client.depsOptimizer;
  if (!optimizer) throw new Error("Vite dependency optimizer was absent; the discovery check did not run.");
  const deadline = Date.now() + 8_000;
  let scanCompleted = false;
  while (Date.now() < deadline) {
    const scan = optimizer.scanProcessing;
    if (scan) { await scan; scanCompleted = true; break; }
    if (Object.keys(optimizer.metadata.discovered).length || Object.keys(optimizer.metadata.optimized).length) {
      scanCompleted = true; // Vite clears scanProcessing after a completed scan.
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  if (!scanCompleted) throw new Error("Vite dependency scan did not start or complete; the discovery check did not run.");
  const processing = Object.values(optimizer.metadata.discovered).flatMap(dep => dep.processing ? [dep.processing] : []);
  await Promise.all(processing);
  const names = Object.keys(optimizer.metadata.optimized).sort();
  if (!names.length) throw new Error("Vite scan completed without optimized fixture dependencies; the check cannot claim a pass.");
  return names;
}

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  for (const server of servers.splice(0)) await server.close();
  for (const root of roots.splice(0).reverse()) {
    const real = fs.realpathSync.native(root);
    if (path.dirname(real).toLowerCase() !== fs.realpathSync.native(tempParent).toLowerCase() || !path.basename(real).startsWith(tempPrefix)) {
      throw new Error(`Refused cleanup outside the owned startup fixture: ${real}`);
    }
    const stat = fs.lstatSync(real);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Refused cleanup of a non-directory startup fixture: ${real}`);
    fs.rmSync(real, { recursive: true });
  }
});

describe("Vite cold-start scope and source HMR", () => {
  it("excludes retained artifacts while discovering the app and updating source", async () => {
    const { root, cache } = await fixture();
    const source = path.join(root, "src/main.ts");
    const artifact = path.join(root, "artifacts/retained.html");

    // Red control: remove the two candidate settings but run actual Vite. The
    // fixture must demonstrate both the wide dependency scan and artifact watch.
    const baseline = await startServer(root, path.join(cache, "baseline"), true);
    const oldOptimizer = baseline.environments.client.depsOptimizer;
    expect(oldOptimizer, "baseline optimizer was actually initialized").toBeDefined();
    expect(await dependencyNames(baseline)).toContain("artifact-only-probe");
    await waitFor("baseline artifact watcher membership", () => watchedFiles(baseline).has(artifact) ? true : undefined);
    await baseline.close();
    servers.splice(servers.indexOf(baseline), 1);

    // Candidate: use the production Vite settings with a fresh optimizer cache.
    const server = await startServer(root, path.join(cache, "candidate"), false);
    const optimizer = server.environments.client.depsOptimizer;
    expect(optimizer, "candidate optimizer was actually initialized").toBeDefined();
    const candidateDependencies = await dependencyNames(server);
    expect(candidateDependencies).toContain("entry-probe");
    expect(candidateDependencies).not.toContain("artifact-only-probe");
    await waitFor("application source watcher membership", () => watchedFiles(server).has(source) ? true : undefined);
    const liveWatch = watchedFiles(server);
    expect(liveWatch.has(artifact)).toBe(false);
    const nodeModules = `${path.resolve(root, "node_modules")}${path.sep}`;
    expect([...liveWatch].some(file => file.startsWith(nodeModules))).toBe(false);

    const address = server.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("Vite did not bind the owned ephemeral test port.");
    const base = `http://127.0.0.1:${address.port}/`;
    expect((await fetch(base)).status).toBe(200);
    expect((await fetch(new URL("src/main.ts", base))).status).toBe(200);
    const client = await (await fetch(new URL("@vite/client", base))).text();
    const token = client.match(/const wsToken = "([^"]+)";/)?.[1];
    if (!token) throw new Error("Vite client did not provide its WebSocket token; HMR did not run.");

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/?token=${token}`, "vite-hmr");
    sockets.push(socket);
    const connected = nextSocketMessage(socket, message => message.type === "connected");
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Could not open Vite's HMR WebSocket.")), { once: true });
    });
    await connected;
    const update = nextSocketMessage(socket, message => message.type === "update");
    fs.writeFileSync(source, 'import { value } from "entry-probe";\nif (import.meta.hot) import.meta.hot.accept();\nconsole.log(value, "version-2");\n');
    const payload = await update;
    const updates = payload.updates as Array<{ path?: string; acceptedPath?: string }> | undefined;
    expect(updates?.some(row => row.path?.endsWith("/src/main.ts") || row.acceptedPath?.endsWith("/src/main.ts"))).toBe(true);
  }, 60_000);
});
