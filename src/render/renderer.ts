import { PCFSoftShadowMap, WebGLRenderer } from "three";

/**
 * Build the renderer, or say clearly why it could not be built.
 *
 * A missing WebGL context is the one failure that has to be loud. A silently
 * absent canvas and a canvas that renders black look the same in a screenshot,
 * and the visual gate would report the first as the second.
 */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      // `preserveDrawingBuffer` is deliberately left off. It looks like the
      // visual harness would need it to screenshot the canvas, and it does not:
      // a full sweep with it off produced the same twelve frames, matching to a
      // tenth on every luminance measure. Chromium captures the canvas at
      // composite time. Turning it on costs a copy every frame against a budget
      // of 60 fps at 1080p, so it stays off until something demonstrates a need.
      powerPreference: "high-performance",
    });
  } catch (cause) {
    throw new Error(
      "WebGL is unavailable, so no frame can be drawn. " +
        "Headless Chromium needs --use-angle=swiftshader --enable-unsafe-swiftshader " +
        `when no GPU is present. Underlying failure: ${String(cause)}`,
      { cause },
    );
  }

  // Device pixel ratio is capped at 2: past that the fill cost doubles again for
  // a difference nobody can see, and the visual gate wants a predictable
  // framebuffer size.
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  // Tone mapping and the rest of the output stage belong to Phase 5. The default
  // is left alone here so that pass has nothing to unpick.
  return renderer;
}

/** Resize the drawing buffer to match the element it is displayed in. */
export function resizeRendererToDisplay(
  renderer: WebGLRenderer,
  width: number,
  height: number,
): void {
  renderer.setSize(width, height, false);
}
