/**
 * Serve two directories that are deliberately not in the bundle.
 *
 * **`/scene/` from `data/scene/`.** `npm run data:scene` writes about 150 MB —
 * the tileset, 67 placed `.b3dm` tiles, the terrain mesh and the road mesh. That
 * is regenerable output, so it lives under the gitignored `data/` with everything
 * else the pipeline fetches and builds. The obvious alternative is Vite's
 * `public/` directory, which would work and would copy all 150 MB into `dist/` on
 * every `npm run build` — and the visual gate builds before every run.
 *
 * **`/draco/` from three.js's own decoder.** Every tile MLIT publishes is
 * Draco-compressed, so nothing draws until a decoder is loaded. three.js ships
 * one in `node_modules`; serving it from there keeps a 512 KB script and a 192 KB
 * WebAssembly binary out of Git, where the canon's blob ceilings would put both of
 * them at the wrong end of a conversation.
 *
 * What this costs, stated plainly: `dist/` is not self-contained. Anyone serving
 * it from somewhere other than `vite preview` has to serve these two directories
 * as well. Nothing in this project does that today, and the app says which file
 * was missing rather than rendering an empty city.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, normalize, resolve, sep } from "node:path";

import type { Connect, Plugin } from "vite";

const CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".b3dm": "application/octet-stream",
  ".mesh": "application/octet-stream",
};

interface Mount {
  route: string;
  directory: string;
  missing: string;
}

export function serveSceneData(rootDirectory: string): Plugin {
  const require = createRequire(join(rootDirectory, "vite.config.ts"));
  const mounts: Mount[] = [
    {
      route: "/scene/",
      directory: resolve(rootDirectory, "data", "scene"),
      missing:
        "That directory is built by `npm run data:scene`, which needs `npm run data:fetch` to " +
        "have run first. It is gitignored, so a fresh checkout has to build it before the scene " +
        "can draw.",
    },
    {
      route: "/draco/",
      directory: dirname(require.resolve("three/examples/jsm/libs/draco/gltf/draco_decoder.js")),
      missing:
        "That is three.js's own Draco decoder, served straight out of node_modules. If it is " +
        "missing, `npm install` has not run or three.js has moved the file.",
    },
  ];

  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    const url = request.url ?? "";
    const mount = mounts.find((candidate) => url.startsWith(candidate.route));
    if (mount === undefined) {
      next();
      return;
    }

    const requested = decodeURIComponent(url.slice(mount.route.length).split("?")[0] ?? "");
    // Resolve first, then check the result is still under the mount. A prefix
    // test on the raw path lets `..%2f..%2f` walk out of it; a test on the
    // resolved path cannot.
    const file = resolve(join(mount.directory, normalize(requested)));
    if (file !== mount.directory && !file.startsWith(mount.directory + sep)) {
      response.statusCode = 403;
      response.end(`Refused: ${url} resolves outside ${mount.route}.`);
      return;
    }

    void (async (): Promise<void> => {
      let size: number;
      try {
        const info = await stat(file);
        if (!info.isFile()) throw new Error("not a file");
        size = info.size;
      } catch {
        response.statusCode = 404;
        response.setHeader("content-type", "text/plain; charset=utf-8");
        response.end(`${url} is not on disk. ${mount.missing}`);
        return;
      }

      const extension = file.slice(file.lastIndexOf("."));
      response.statusCode = 200;
      response.setHeader("content-type", CONTENT_TYPES[extension] ?? "application/octet-stream");
      response.setHeader("content-length", String(size));
      // No caching. The gate rebuilds the scene between runs and a cached tile
      // from a previous build would be photographed as if it were this one.
      response.setHeader("cache-control", "no-store");
      createReadStream(file).pipe(response);
    })();
  };

  return {
    name: "maps:serve-scene-data",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
