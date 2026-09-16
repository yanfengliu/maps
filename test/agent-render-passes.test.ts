/** Bound: actual HumanRenderer pass wiring and upstream shader hooks, without a GPU.
 * World pixels, shadows and AO over motion remain a separate browser gate.
 */
import {
  BufferGeometry, DataTexture, DoubleSide, Float32BufferAttribute, Group, InstancedMesh,
  Mesh, MeshStandardMaterial, ShaderLib, Texture, type Material, type WebGLRenderer,
} from "three";
import { expect, it, vi } from "vitest";
import type { AgentAssetManifest } from "../src/world/agent-assets.js";
import type { AgentPoseBuffers } from "../src/world/agent-poses.js";
import { WORLD_STYLES } from "../src/world/styles.js";
import { getAgentNormalMaterial } from "../src/agents/render/pass-materials.js";

vi.mock("../src/agents/render/assets.js", async () => {
  const actual = await vi.importActual<typeof import("../src/agents/render/assets.js")>("../src/agents/render/assets.js");
  const manifest: AgentAssetManifest = {
    version: 2, id: "fixture", units: "metres", up: "+Y", forward: "+Z", origin: "feet", yawAxis: "+Y", vatSpace: "world-baked",
    vertexAttribute: "_VAT_ID", textureFormat: "rgba16f-le", sources: [], animation: "fixture", qualityStatus: "test",
    clips: [
      { id: "walk", firstFrame: 0, frameCount: 32, durationSeconds: 1, strideMetres: 1.1, loop: true },
      { id: "idle", firstFrame: 32, frameCount: 16, durationSeconds: 2.5, strideMetres: 0, loop: true },
    ],
    lods: (["near", "medium", "far"] as const).map(id => ({
      id, model: "fixture.glb", modelSha256: "fixture", vertexCount: 3, bounds: { min: [-1, 0, -1], max: [1, 2, 1] },
      drawParts: [{ node: "fixture", primitive: 0, vertexCount: 3, indexCount: 3, bindMatrix: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] }],
      positions: "positions.bin", normals: "normals.bin", positionSha256: "fixture", normalSha256: "fixture",
      textureWidth: 4, textureHeight: 48, rowsPerFrame: 1, bytes: 1536, maxAnkleTargetErrorMetres: 0, maxStanceWorldDriftMetres: 0,
    })),
  };
  return {
    ...actual,
    loadManifest: async () => manifest,
    loadVat: async () => new DataTexture(),
    loadModel: async () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setAttribute("_vat_id", new Float32BufferAttribute([0, 1, 2], 1));
      const scene = new Group();
      const mesh = new Mesh(geometry, new MeshStandardMaterial({ map: new Texture(), alphaMap: new Texture(), side: DoubleSide }));
      scene.add(mesh);
      return { scene, parser: {
        associations: new Map([[mesh, { nodes: 0, meshes: 0, primitives: 0 }]]),
        json: { scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: "fixture", mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0, _VAT_ID: 1 } }] }],
          accessors: [{ count: 3 }, { count: 3 }], bufferViews: [] },
      } };
    },
  };
});

const { HumanRenderer } = await import("../src/agents/render/humans.js");

it("attaches matching VAT and cutout materials to every rendered human LOD and pass", async () => {
  const snapshot = () => ({ position: new Float32Array(3), supportNormal: new Float32Array([0, 1, 0]), yaw: new Float32Array(1), travelledMetres: new Float64Array(1), generation: new Uint32Array(1) });
  const poses: AgentPoseBuffers = { count: 1, previous: snapshot(), current: snapshot(), active: new Uint8Array([1]), speedMps: new Float32Array([1]), scale: new Float32Array([1]), variant: new Uint8Array(1) };
  const humans = new HumanRenderer(poses);
  try {
    await humans.load(WORLD_STYLES[0]!);
    const meshes = humans.group.children as InstancedMesh[];
    expect(meshes).toHaveLength(9);
    for (const mesh of meshes) {
      const color = mesh.material as MeshStandardMaterial;
      const normal = getAgentNormalMaterial(mesh);
      const materials = [color, mesh.customDepthMaterial, mesh.customDistanceMaterial, normal];
      const shaderIds = ["standard", "depth", "distanceRGBA", "normal"] as const;
      let expectedPositions: unknown;
      for (const [index, material] of materials.entries()) {
        expect(material, `${mesh.name}/${shaderIds[index]}`).toBeDefined();
        const upstream = ShaderLib[shaderIds[index]!]!;
        const shader = { vertexShader: upstream.vertexShader, fragmentShader: upstream.fragmentShader, uniforms: {} } as Parameters<Material["onBeforeCompile"]>[0];
        material!.onBeforeCompile(shader, {} as WebGLRenderer);
        expect(shader.vertexShader).toContain("vec3 transformed = agentPose(agentPositions)");
        if (index === 0) expectedPositions = shader.uniforms["agentPositions"]!.value;
        expect(shader.uniforms["agentPositions"]!.value).toBe(expectedPositions);
        if (index === 3) {
          expect(shader.vertexShader).toContain("objectNormal = normalize(agentPose(agentNormals))");
          expect(shader.fragmentShader).toContain("if (agentAlpha < agentCutoutThreshold) discard;");
          expect(shader.uniforms["agentCutoutMap0"]!.value).toBe(color.map);
          expect(shader.uniforms["agentCutoutMap1"]!.value).toBe(color.alphaMap);
          expect(shader.uniforms["agentCutoutThreshold"]!.value).toBe(color.alphaTest);
          expect(normal!.side).toBe(color.side);
        }
      }
      humans.setStyle(WORLD_STYLES[1]!);
      expect(mesh.material).toBe(color);
      expect(getAgentNormalMaterial(mesh)).toBe(normal);
    }
  } finally { humans.dispose(); }
});
