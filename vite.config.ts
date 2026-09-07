import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // The visual gate photographs the production build, not the dev server, so
    // sourcemaps are kept: a runtime failure in a gate run has to be readable.
    sourcemap: true,
    target: "es2023",
  },
  // Ports that are not the Vite defaults, and strict about it. Every repo in
  // this fleet would otherwise want 5173 and 4173, and a preview that quietly
  // drifts to the next free port is how a gate ends up photographing a sibling
  // project's app.
  //
  // The host is pinned to 127.0.0.1 rather than left as `localhost`. Left to
  // resolve, `localhost` can bind IPv6 only, and then a client dialling
  // 127.0.0.1 gets a connection refused from a server that is plainly running —
  // which is what happened here before it was pinned.
  server: {
    host: "127.0.0.1",
    port: 5319,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4319,
    strictPort: true,
  },
});
