import { BackSide, Box3, FrontSide, Matrix4, Mesh, Ray, Sphere, Vector3, type BufferGeometry, type Material, type Raycaster } from "three";

interface Node { box: Box3; start: number; end: number; left?: Node; right?: Node }
interface Index { geometry: BufferGeometry; position: unknown; version: number; index: unknown; indexVersion: number; order: number[]; root: Node }

/** Boolean ray queries against static building triangles. The local-space BVH
 * only rejects empty regions; the same Three triangle test, material winding and
 * world-distance limits decide contact. Source meshes are never modified.
 * Recreate this owner when the retained building-model revision changes. */
export function createWalkCollision(meshes: readonly Mesh[]): {
  intersects(raycaster: Raycaster, candidates?: readonly Mesh[]): boolean;
} {
  const indices = new WeakMap<Mesh, Index>();
  const inverse = new Matrix4(), localRay = new Ray(), sphereRay = new Ray(), sphere = new Sphere();
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), point = new Vector3(), world = new Vector3();
  const hits: Parameters<Mesh["raycast"]>[1] = [];
  const fallback = (mesh: Mesh, raycaster: Raycaster): boolean => {
    hits.length = 0;
    try { raycaster.intersectObject(mesh, false, hits); return hits.length > 0; }
    finally { hits.length = 0; }
  };
  const supported = (mesh: Mesh): boolean => {
    const g = mesh.geometry;
    const implementation = mesh as Mesh & { _computeIntersections?: unknown };
    const ordinary = Mesh.prototype as Mesh & { _computeIntersections?: unknown };
    return mesh.material !== undefined && mesh.raycast === Mesh.prototype.raycast && mesh.getVertexPosition === Mesh.prototype.getVertexPosition &&
      implementation._computeIntersections === ordinary._computeIntersections &&
      !(mesh as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean }).isSkinnedMesh &&
      !(mesh as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh && !g.morphAttributes.position?.length &&
      Boolean(g.attributes.position) && (g.index?.count ?? g.attributes.position!.count) % 3 === 0 &&
      Number.isInteger(g.drawRange.start) && g.drawRange.start >= 0 && g.drawRange.start % 3 === 0 &&
      g.groups.every(group => Number.isInteger(group.start) && group.start >= 0 && group.start % 3 === 0) &&
      (!Array.isArray(mesh.material) || g.groups.every(group => Number.isInteger(group.materialIndex) && group.materialIndex! >= 0 && Boolean((mesh.material as Material[])[group.materialIndex!]))) &&
      mesh.matrixWorld.determinant() !== 0;
  };
  const indexFor = (mesh: Mesh): Index => {
    const geometry = mesh.geometry, position = geometry.attributes.position!, element = geometry.index;
    const version = "data" in position ? position.data.version : position.version;
    let index = indices.get(mesh);
    if (index?.geometry === geometry && index.position === position && index.version === version && index.index === element && index.indexVersion === (element?.version ?? 0)) return index;
    const count = (element?.count ?? position.count) / 3, order = Array.from({ length: count }, (_, i) => i);
    const bounds = new Float64Array(count * 6);
    for (let triangle = 0; triangle < count; triangle++) {
      const offset = triangle * 3;
      a.fromBufferAttribute(position, element ? element.getX(offset) : offset);
      b.fromBufferAttribute(position, element ? element.getX(offset + 1) : offset + 1);
      c.fromBufferAttribute(position, element ? element.getX(offset + 2) : offset + 2);
      bounds.set([Math.min(a.x, b.x, c.x), Math.min(a.y, b.y, c.y), Math.min(a.z, b.z, c.z), Math.max(a.x, b.x, c.x), Math.max(a.y, b.y, c.y), Math.max(a.z, b.z, c.z)], triangle * 6);
    }
    const build = (start: number, end: number): Node => {
      const box = new Box3();
      for (let i = start; i < end; i++) {
        const offset = order[i]! * 6;
        box.min.min(a.fromArray(bounds, offset)); box.max.max(a.fromArray(bounds, offset + 3));
      }
      // Conservative padding protects seam and nearly parallel broad-phase rays.
      box.expandByScalar(1e-9);
      const node: Node = { box, start, end };
      if (end - start > 16) {
        const size = box.getSize(a), axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
        const sorted = order.slice(start, end).sort((x, y) => (bounds[x * 6 + axis]! + bounds[x * 6 + axis + 3]!) - (bounds[y * 6 + axis]! + bounds[y * 6 + axis + 3]!));
        for (let i = 0; i < sorted.length; i++) order[start + i] = sorted[i]!;
        const middle = start + Math.floor((end - start) / 2);
        node.left = build(start, middle); node.right = build(middle, end);
      }
      return node;
    };
    index = { geometry, position, version, index: element, indexVersion: element?.version ?? 0, order, root: build(0, count) };
    indices.set(mesh, index); return index;
  };
  return {
    intersects(raycaster, candidates = meshes): boolean {
      for (const mesh of candidates) {
        if (!raycaster.layers.test(mesh.layers)) continue;
        if (!supported(mesh)) { if (fallback(mesh, raycaster)) return true; continue; }
        const geometry = mesh.geometry;
        if (!geometry.boundingSphere) geometry.computeBoundingSphere();
        sphere.copy(geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
        sphereRay.copy(raycaster.ray).recast(raycaster.near);
        if (!sphere.containsPoint(sphereRay.origin)) {
          if (!sphereRay.intersectSphere(sphere, point) || sphereRay.origin.distanceToSquared(point) > (raycaster.far - raycaster.near) ** 2) continue;
        }
        inverse.copy(mesh.matrixWorld).invert(); localRay.copy(raycaster.ray).applyMatrix4(inverse);
        if (geometry.boundingBox && !localRay.intersectsBox(geometry.boundingBox)) continue;
        const index = indexFor(mesh), position = geometry.attributes.position!, element = geometry.index;
        const count = element?.count ?? position.count, range = geometry.drawRange;
        const triangleHit = (offset: number, material: Material): boolean => {
          a.fromBufferAttribute(position, element ? element.getX(offset) : offset);
          b.fromBufferAttribute(position, element ? element.getX(offset + 1) : offset + 1);
          c.fromBufferAttribute(position, element ? element.getX(offset + 2) : offset + 2);
          const contact = material.side === BackSide ? localRay.intersectTriangle(c, b, a, true, point) : localRay.intersectTriangle(a, b, c, material.side === FrontSide, point);
          if (!contact) return false;
          world.copy(contact).applyMatrix4(mesh.matrixWorld);
          const distance = raycaster.ray.origin.distanceTo(world);
          return distance >= raycaster.near && distance <= raycaster.far;
        };
        const visit = (node: Node): boolean => {
          if (!localRay.intersectsBox(node.box)) return false;
          if (node.left) return visit(node.left) || visit(node.right!);
          for (let i = node.start; i < node.end; i++) {
            const offset = index.order[i]! * 3;
            if (Array.isArray(mesh.material)) {
              for (const group of geometry.groups) {
                if (offset >= Math.max(group.start, range.start) && offset < Math.min(count, group.start + group.count, range.start + range.count) && triangleHit(offset, mesh.material[group.materialIndex!]!)) return true;
              }
            } else if (offset >= Math.max(0, range.start) && offset < Math.min(count, range.start + range.count) && triangleHit(offset, mesh.material)) return true;
          }
          return false;
        };
        if (visit(index.root)) return true;
      }
      return false;
    },
  };
}
