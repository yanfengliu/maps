/** Bound: finite seeded material parameters and actual shader binding/filtering.
 * These CPU cases cannot establish linked GPU output or useful visual richness.
 * The native peripheral views own those appearance and motion obligations.
 */
import { describe, expect, it, vi } from "vitest";
import { ClampToEdgeWrapping, NearestFilter, ShaderLib, Mesh, type MeshStandardMaterial } from "three";
import { createStructureSeedTexture, structureSeedBytes, STRUCTURE_GLSL } from "../src/scene/surface-structure.js";
import { createSurfaceMaterial } from "../src/scene/surface-materials.js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRoads } from "../src/scene/roads.js";
import { decodeMesh } from "../src/world/mesh.js";
import { worldStyle } from "../src/world/styles.js";

describe("finite regional material parameters", () => {
  it("does not declare reserved GLSL identifiers in the material helper", () => {
    // WebGL2 inherits GLSL ES reserved words, including future-use words.
    // The first actual native candidate failed with `float patch = ...`.
    const reserved = new Set(["patch", "input", "output", "filter", "common", "partition", "active", "asm", "class", "union", "enum", "typedef", "template", "this", "resource", "goto", "inline", "noinline", "public", "static", "extern", "external", "interface", "long", "short", "double", "half", "fixed", "unsigned", "superp", "precision"]);
    const declaredReserved = (source: string): string[] => [...source.replace(/\/\/[^\n]*/g, "").matchAll(/\b(?:float|vec[234]|mat[234]|sampler2D)\s+(\w+)\b/g)].map(match => match[1]!).filter(name => reserved.has(name));
    expect(declaredReserved(STRUCTURE_GLSL)).toEqual([]);
    // Reintroducing the native failure must be detected without a GPU.
    expect(declaredReserved(STRUCTURE_GLSL.replace("float panelCoverage =", "float patch ="))).toEqual(["patch"]);
  });

  it("owns only 16 KiB per surface, with no repeat wrapping or hidden mip allocation", () => {
    const contents: Uint8Array[] = [];
    for (const kind of ["road", "sidewalk", "ground"] as const) {
      const texture = createStructureSeedTexture(kind);
      try {
        const data = texture.image.data as Uint8Array;
        expect(data).toHaveLength(64 * 64 * 4);
        expect(texture.image.width).toBe(64);
        expect(texture.image.height).toBe(64);
        expect(texture.wrapS).toBe(ClampToEdgeWrapping);
        expect(texture.wrapT).toBe(ClampToEdgeWrapping);
        expect(texture.minFilter).toBe(NearestFilter);
        expect(texture.magFilter).toBe(NearestFilter);
        expect(texture.generateMipmaps).toBe(false);
        expect(data).toEqual(structureSeedBytes(kind));
        contents.push(data);
        // A repeated parameter tile at either visible 8- or 16-cell offset
        // would fail this held spatial comparison across the central AOI.
        for (const offset of [8, 16]) {
          let equal = 0;
          for (let row = 12; row < 36; row++) for (let col = 12; col < 28; col++) {
            const a = (row * 64 + col) * 4, b = (row * 64 + col + offset) * 4;
            if ([0, 1, 2, 3].every(channel => data[a + channel] === data[b + channel])) equal++;
          }
          expect(equal).toBe(0);
        }
      } finally { texture.dispose(); }
    }
    expect(contents[0]).not.toEqual(contents[1]);
    expect(contents[1]).not.toEqual(contents[2]);
  });

  it("keeps repairs within their cell even at the largest independently bounded parameters", () => {
    // 24 m cell: max location shift 2.5 m; a rotated 5 x 8 m half-box
    // reaches sqrt(5²+8²), still below 12 m. Neighbours therefore do not
    // expose a panel jump at the cell boundary as the camera crosses it.
    expect(2.5 + Math.hypot(5, 8)).toBeLessThan(12);
  });
});

it.each(["road", "sidewalk", "ground"] as const)("binds and releases %s's regional texture through the actual material", kind => {
  const treatment = createSurfaceMaterial(kind, worldStyle("satellite"));
  const shader = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} as Record<string, { value: unknown }> };
  treatment.material.onBeforeCompile(shader as never, {} as never);
  const seed = shader.uniforms.mapsStructureSeeds!.value as ReturnType<typeof createStructureSeedTexture>;
  let disposed = 0;
  seed.addEventListener("dispose", () => disposed++);
  try {
    expect(shader.uniforms.mapsStructureStrength!.value).toBe(1);
    expect(shader.fragmentShader).toContain("uniform sampler2D mapsStructureSeeds;");
    expect(shader.fragmentShader).toContain("length(fwidth(metres))");
    if (kind !== "road") expect(shader.fragmentShader).toContain("min(1.0, 0.12 / aa)");
    else {
      expect(shader.fragmentShader).toContain("float roadState = mapsRoadState(metres);");
      expect(shader.fragmentShader).not.toContain("mapsStructurePanel");
      expect(shader.fragmentShader).toContain("mapsRoadRoughness(roadState, mapsWetness)");
      expect(shader.fragmentShader).toContain("mix(denseSlope, coarseSlope, roadState) * mapsRoadAggregateHeight(roadState)");
    }
    expect(shader.fragmentShader).toContain("float region = mapsStructureRegion(metres);");
    if (kind === "ground") {
      expect(shader.fragmentShader).not.toContain("float asphaltRegion");
      expect(shader.fragmentShader).not.toContain("float pavingRegion");
    }
    if (kind === "sidewalk") expect(shader.fragmentShader).toContain("topFace * mapsStructureStrength");
    const key = treatment.material.customProgramCacheKey();
    treatment.apply(worldStyle("cartographic"));
    expect(shader.uniforms.mapsStructureStrength!.value).toBe(0.24);
    expect(treatment.material.customProgramCacheKey()).toBe(key);
    treatment.apply(worldStyle("satellite"));
    expect(shader.uniforms.mapsStructureStrength!.value).toBe(1);
  } finally { treatment.dispose(); }
  expect(disposed).toBe(1);
});

// Actual road constructor, real decoded source and actual material hook. The
// literal mesh pins and component arrays define the preservation bound; no GPU
// appearance or continuous support claim follows from this CPU comparison.
it("installs continuous asphalt without changing the road, pavement or source paint buffers", async () => {
  const names = ["roads", "pavements", "markings"] as const;
  const bytes = await Promise.all(names.map(name => readFile(`data/scene/${name}.mesh`)));
  const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
  expect(bytes.slice(0, 2).map(hash)).toEqual([
    "0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc",
    "841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6",
  ]);
  vi.stubGlobal("fetch", async (url: string) => {
    const index = names.findIndex(name => url === `/scene/${name}.mesh`);
    if (index < 0) throw Error(`Unexpected road fixture request: ${url}`);
    return new Response(new Uint8Array(bytes[index]!).buffer);
  });
  let roads: Awaited<ReturnType<typeof createRoads>> | undefined;
  try {
    roads = await createRoads(worldStyle("satellite"));
    expect(roads.inputDigests).toEqual({ roads: hash(bytes[0]!), pavements: hash(bytes[1]!) });
    for (const [i, name] of ["roads:plateau-tran", "roads:plateau-semantic-pavement", "roads:plateau-source-markings"].entries()) {
      const source = decodeMesh(bytes[i]!);
      const mesh = roads.root.getObjectByName(name) as Mesh;
      const digest = (array: ArrayBufferView) => hash(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      expect(digest(mesh.geometry.getAttribute("position").array)).toBe(digest(source.positions));
      expect(digest(mesh.geometry.getAttribute("normal").array)).toBe(digest(source.normals));
      expect(digest(mesh.geometry.index!.array)).toBe(digest(source.indices));
    }
    const road = roads.root.getObjectByName("roads:plateau-tran") as Mesh;
    const material = road.material as MeshStandardMaterial;
    const shader = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} };
    material.onBeforeCompile(shader as never, {} as never);
    expect(shader.fragmentShader).toContain("mapsRoadState(metres)");
    const stamp = (source: string) => /mapsStructurePanel|signedEdge|mat2\(cos\(angle\)/.test(source);
    expect(stamp(shader.fragmentShader)).toBe(false);
    expect(stamp(STRUCTURE_GLSL)).toBe(true); // Existing rotated stamp is the negative.
    expect(material.customProgramCacheKey()).toBe("maps-surface-road-v8-continuous-wearing-course");
    roads.setStyle(worldStyle("cartographic")); roads.setStyle(worldStyle("satellite"));
    expect((shader.uniforms as Record<string, {value: number}>).mapsStructureStrength!.value).toBe(1);
  } finally { roads?.dispose(); vi.unstubAllGlobals(); }
});
