/**
 * Claim: no mesh of an authored signage board can draw towards a viewer standing
 * on the far side of the wall the board is mounted on.
 *
 * The defect this gate exists for: the crossing sequence's signature shot carried
 * a stationary 30,339 px black surface over the northern half of the crossing, and
 * it was board 2's 11 x 8 m mount seen from behind. The panel is `FrontSide` and
 * was culled; the 0.22 m `BoxGeometry` frame behind it was not, so an unlit
 * `0x161a20` box was what the frame showed. Board 2 is fitted 28.5 m from that
 * camera, on a wall whose outward normal points away from it, which is why the
 * slab was large and central rather than a speck.
 *
 * What is checked is the property that made it possible, for every mesh of every
 * board: a ray fired at a mesh from behind its own front normal must find nothing.
 * That is three's own triangle-side rule — the renderer culls a front face the
 * same way `Raycaster` skips it — applied to the real scene graph, so a box
 * reappearing behind a panel fails this by name rather than by pixel.
 *
 * Bound: the scene graph and three's raycaster, in node, with the 2D canvas
 * stubbed. It renders no frame, so it says nothing about the post chain, the
 * lighting, or how large the surface would have been on screen; the rendered half
 * of this gate is `tools/render-defects/crossing-surface.spec.ts`, which measures
 * the near-black region at the recorded camera.
 *
 * Mutation: restoring `body.add(new Mesh(new BoxGeometry(w + 0.25, h + 0.25, 0.22), …))`
 * in place of the one-sided frame fails `draws nothing towards a viewer behind the
 * wall` for every board, with the box's own rear face named as the hit.
 */
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Raycaster, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { HERO_BOARDS, createAuthoredSignage } from "../src/scene/signage.js";

/**
 * A 2D canvas stub. `createAuthoredSignage` draws each board's face with the 2D
 * canvas API and nothing else in this test touches the DOM.
 */
function stubCanvas(): void {
  const context = {
    fillStyle: "", font: "", textAlign: "",
    fillRect: () => undefined, fillText: () => undefined,
    beginPath: () => undefined, arc: () => undefined, fill: () => undefined,
  };
  (globalThis as { document?: unknown }).document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
}

/**
 * One wall per board, perpendicular to the board's authored bearing and facing
 * the world origin, 30 m out and 40 m square: enough for `mount` to fit every
 * board at scale 1.
 *
 * A wall is a stand-in for the building tiles so this test does not need 148 MB
 * of scene data. What it has to reproduce is the fit's geometry, not the tile's
 * texture: a vertical surface between 4 m and 120 m along the bearing whose
 * normal points back at the crossing.
 */
function buildingWalls(): Group {
  const group = new Group();
  for (const board of HERO_BOARDS) {
    const bearing = new Vector3(board.x, 0, board.z).normalize();
    const wall = new Mesh(new PlaneGeometry(40, 40), new MeshBasicMaterial());
    wall.position.set(bearing.x * 30, board.y, bearing.z * 30);
    wall.lookAt(0, board.y, 0);
    wall.updateMatrixWorld(true);
    group.add(wall);
  }
  group.updateMatrixWorld(true);
  return group;
}

function meshesUnder(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

describe("authored signage boards", () => {
  it("mounts every board on the wall its bearing finds", () => {
    stubCanvas();
    const signage = createAuthoredSignage(7);
    signage.mount(buildingWalls());
    expect(signage.counts.boards, "every authored board should fit the wall its own bearing finds").toBe(HERO_BOARDS.length);
    signage.dispose();
  });

  it("draws nothing towards a viewer behind the wall", () => {
    stubCanvas();
    const signage = createAuthoredSignage(7);
    signage.mount(buildingWalls());
    signage.root.updateMatrixWorld(true);
    const meshes = meshesUnder(signage.root);
    expect(meshes.length, "the signage root should hold a panel and a frame per board").toBeGreaterThan(0);

    const raycaster = new Raycaster();
    const world = new Vector3();
    const front = new Vector3();
    const seen: string[] = [];
    const hidden: string[] = [];
    for (const mesh of meshes) {
      mesh.getWorldPosition(world);
      // The mesh's own local +Z, which is the direction its front face looks.
      front.set(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(mesh.quaternion.clone())).normalize();
      for (const reach of [5, 20, 60]) {
        for (const offset of [0, 0.3, -0.3]) {
          const probe = world.clone().addScaledVector(front, -reach);
          probe.y += offset;
          raycaster.set(probe, world.clone().sub(probe).normalize());
          raycaster.near = 0;
          raycaster.far = reach * 2;
          if (raycaster.intersectObject(mesh, false).length > 0) {
            seen.push(`${mesh.name} is drawn from ${reach} m behind its own front`);
          }
        }
      }
      const probe = world.clone().addScaledVector(front, 20);
      raycaster.set(probe, world.clone().sub(probe).normalize());
      raycaster.near = 0;
      raycaster.far = 40;
      if (raycaster.intersectObject(mesh, false).length === 0) hidden.push(`${mesh.name} is not drawn from in front`);
    }

    expect(seen, "a board mesh that faces a viewer behind the wall is a black slab over whatever is behind it").toEqual([]);
    expect(hidden, "removing what is drawn from behind must not remove the board's own face").toEqual([]);
    signage.dispose();
  });

  it("fails when an opaque frame is put back behind a panel", () => {
    // The positive control: the same probe against the box the fix replaced. It
    // is here so a green run above cannot be a probe that never reaches anything.
    const board = HERO_BOARDS[2]!;
    const mount = new Group();
    const panel = new Mesh(new PlaneGeometry(board.widthM, board.heightM), new MeshBasicMaterial());
    const box = new Mesh(new BoxGeometry(board.widthM + 0.25, board.heightM + 0.25, 0.22), new MeshBasicMaterial());
    box.position.z = -0.13;
    mount.add(box, panel);
    mount.updateMatrixWorld(true);

    const raycaster = new Raycaster();
    const behind = new Vector3(0, 0, -20);
    raycaster.set(behind, new Vector3(0, 0, 20).sub(behind).normalize());
    const hits = raycaster.intersectObject(box, false);
    expect(hits.length, "the box this gate replaced must be visible from behind, or the probe proves nothing").toBeGreaterThan(0);
  });
});
