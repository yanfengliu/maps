/** The five verified packet buffers shared by normal and explicit capture builds. */
import type { Connect, Plugin } from "vite";
import { LOCAL_WALK_FILES, readLocalWalkPacket } from "../agents/local-walk/packet.ts";

export function localWalkServer(packetDirectory: string): { plugin: Plugin; binding: { url: string; sha256: string } } {
  const files = new Map([...readLocalWalkPacket(packetDirectory)].map(([name, bytes]) => [`/local-walk/${name}`, bytes]));
  // Serve the same verified buffers; no artifact directory is mounted and no
  // later disk change can pass a hash-then-open gap.
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    const path = (request.url ?? "").split("?")[0]!;
    if (!path.startsWith("/local-walk/")) { next(); return; }
    const bytes = files.get(path);
    response.setHeader("Cache-Control", "no-store");
    if (!bytes) { response.statusCode = 404; response.end(`Local walker route ${path} is not one of the five prepared packet files.`); return; }
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Content-Length", bytes.length);
    response.end(bytes);
  };
  return {
    binding: { url: "/local-walk/manifest.json", sha256: LOCAL_WALK_FILES[0][2] },
    plugin: {
      name: "maps:prepared-local-walk",
      configureServer(server) { server.middlewares.use(middleware); },
      configurePreviewServer(server) { server.middlewares.use(middleware); },
    },
  };
}
