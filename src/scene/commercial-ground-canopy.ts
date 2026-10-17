import { Triangle, Vector3 } from "three";

type Plan = [number, number];
interface Surface { triangle(a: readonly number[], b: readonly number[], c: readonly number[], color: number): void; quad(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[], color: number): void }
interface Front { at(s: number, y: number, d: number): Plan; u: Vector3; n: Vector3; length: number }
export interface CanopyRoom { plan: Plan[]; color: number; side: "south" | "east"; sharedEdges?: [Plan, Plan][] }
const cross = (a: Plan, b: Plan, c: Plan): number => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const ordered = (p: Plan[]): Plan[] => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a[0] * b[1] - a[1] * b[0]; }, 0) < 0 ? p.toReversed() : p;

/** A single authored header profile, shared miter and adjoining room panels.
 * The five photographic intervals are constrained cap edges. This does not
 * overlay solids, infer priorities, round shared vertices or discard cells. */
export function buildCommercialCanopy({ stone, metal, rooms, panels, south, east, origin, ceiling, high, cut, seams, refuse }: {
  stone: Surface; metal: Surface; rooms: Surface; panels: CanopyRoom[]; south: Front; east: Front; origin: Vector3;
  ceiling: number; high: number; cut: number; seams: Plan[][]; refuse(message: string): never;
}): void {
  const fronts = { south, east }, back = -.30;
  const covector = (front: Front): Plan => { const det = front.u.x * front.n.z - front.u.z * front.n.x; return [-front.u.z / det, front.u.x / det]; };
  const ns = covector(south), ne = covector(east), determinant = ns[0] * ne[1] - ns[1] * ne[0];
  const points = new Map<string, Plan>();
  const keep = (p: Plan): Plan => { const key = p.join(","); if (!points.has(key)) points.set(key, p); return points.get(key)!; };
  const hinge = (d: number): Plan => keep([origin.x + d * (ne[1] - ns[1]) / determinant, origin.z + d * (ns[0] - ne[0]) / determinant]);
  const depth = (front: Front, p: Plan): number => { const n = covector(front); return n[0] * (p[0] - origin.x) + n[1] * (p[1] - origin.z); };
  const along = (front: Front, p: Plan): number => { const det = front.u.x * front.n.z - front.u.z * front.n.x; return ((p[0] - origin.x) * front.n.z - (p[1] - origin.z) * front.n.x) / det; };
  const endAnchors = new Map<Front, Plan>();
  const endPoint = (front: Front, d: number): Plan => { const anchor = endAnchors.get(front)!; const offset = d - depth(front, anchor); return offset === 0 ? keep(anchor) : keep([anchor[0] + front.n.x * offset, anchor[1] + front.n.z * offset]); };
  const rear = panels.map(panel => {
    const front = fronts[panel.side], plan: Plan[] = [];
    for (const [i, a] of panel.plan.entries()) {
      const b = panel.plan[(i + 1) % panel.plan.length]!, da = back - depth(front, a), db = back - depth(front, b);
      if (da >= 0) plan.push(keep(a));
      if (da * db < 0) plan.push(keep([a[0] + (b[0] - a[0]) * da / (da - db), a[1] + (b[1] - a[1]) * da / (da - db)]));
    }
    if (plan.length < 3) refuse("complete rear room panel");
    return { ...panel, plan: ordered(plan) };
  });
  const backPoints = (side: "south" | "east"): Plan[] => {
    const front = fronts[side];
    return [...new Set([hinge(back), endPoint(front, back), ...rear.filter(p => p.side === side).flatMap(p => p.plan.filter(v => Math.abs(depth(front, v) - back) < 1e-10))])].sort((a, b) => along(front, a) - along(front, b));
  };
  const triangulate = (input: Plan[], emit: (p: Plan[]) => void): void => {
    const polygon = ordered(input.filter((p, i) => p !== input[(i + input.length - 1) % input.length]));
    while (polygon.length >= 3) {
      let selected = -1, largest = 0;
      for (let i = 0; i < polygon.length; i++) {
        const previous = (i + polygon.length - 1) % polygon.length, next = (i + 1) % polygon.length;
        const a = polygon[previous]!, b = polygon[i]!, c = polygon[next]!, area = cross(a, b, c);
        if (area <= 0 || polygon.some((p, j) => j !== previous && j !== i && j !== next && cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0)) continue;
        if (area > largest) { selected = i; largest = area; }
      }
      if (selected < 0) refuse("complete directed canopy triangulation");
      const p = [polygon[(selected + polygon.length - 1) % polygon.length]!, polygon[selected]!, polygon[(selected + 1) % polygon.length]!];
      emit(p); polygon.splice(selected, 1);
    }
  };
  const surface = (out: Surface, input: Plan[], y: number, color: number, up: boolean): void => triangulate(input, p => {
    const encoded = p.map(v => [Math.fround(v[0]), Math.fround(v[1])] as Plan);
    if (!(cross(encoded[0]!, encoded[1]!, encoded[2]!) > 0)) refuse(`canopy triangle has no outward Float32 area at ${JSON.stringify(p)}`);
    if (up) p.reverse(); out.triangle(...p.map(v => [v[0], y, v[1]]) as [number[], number[], number[]], color);
  });
  const adjacency = new Map<Plan, Plan[]>();
  for (const [a, b] of seams) { if (!a || !b) refuse("source-cut interval endpoints"); adjacency.set(a!, [...(adjacency.get(a!) ?? []), b!]); adjacency.set(b!, [...(adjacency.get(b!) ?? []), a!]); }
  const ends = [...adjacency].filter(([, rows]) => rows.length === 1).map(([p]) => p);
  if (seams.length !== 5 || ends.length !== 2 || [...adjacency.values()].some(rows => rows.length > 2)) refuse("five connected actual source-cut intervals");
  const chain = [ends.sort((a, b) => along(south, b) - along(south, a))[0]!]; let previous: Plan | undefined;
  while (true) { const next = adjacency.get(chain.at(-1)!)!.find(p => p !== previous); if (!next) break; previous = chain.at(-1)!; chain.push(next); if (chain.length > 6) refuse("acyclic photographic seam"); }
  if (chain.length !== 6) refuse("complete photographic seam chain");
  endAnchors.set(south, chain[0]!); endAnchors.set(east, chain.at(-1)!);
  const seam = chain.map(keep);
  surface(metal, [endPoint(south, .025), hinge(.025), endPoint(east, .025), ...seam.toReversed()], cut, 0x3f4849, true);
  surface(stone, [...seam, ...backPoints("east").toReversed(), ...backPoints("south").slice(1)], cut, 0xc6c3b5, true);
  surface(metal, [hinge(.005), endPoint(south, .005), ...backPoints("south").toReversed(), ...backPoints("east").slice(1), endPoint(east, .005)], ceiling, 0x354348, false);
  for (const side of ["south", "east"] as const) {
    const front = fronts[side];
    const face = (d0: number, y0: number, d1: number, y1: number, out: Surface, color: number): void => {
      const a = hinge(d0), b = endPoint(front, d0), c = endPoint(front, d1), d = hinge(d1);
      const v = [[a[0], y0, a[1]], [b[0], y0, b[1]], [c[0], y1, c[1]], [d[0], y1, d[1]]];
      const desired = y0 === y1 ? new Vector3(0, d1 > d0 ? -1 : 1, 0) : front.n;
      if (new Triangle(new Vector3(...v[0]!), new Vector3(...v[1]!), new Vector3(...v[2]!)).getNormal(new Vector3()).dot(desired) < 0) v.reverse();
      out.quad(v[0]!, v[1]!, v[2]!, v[3]!, color);
    };
    face(.005, ceiling, .005, high, metal, 0x354348); face(.005, high, .075, high, stone, 0xc6c3b5);
    face(.075, high, .075, cut - .065, stone, 0xc6c3b5); face(.075, cut - .065, .025, cut - .065, stone, 0xc6c3b5); face(.025, cut - .065, .025, cut, metal, 0x3f4849);
    const edge = backPoints(side);
    for (let i = 0; i + 1 < edge.length; i++) {
      const a = edge[i]!, b = edge[i + 1]!;
      if (rear.some(panel => panel.side === side && panel.plan.some((p, j) => (p === a && panel.plan[(j + 1) % panel.plan.length] === b) || (p === b && panel.plan[(j + 1) % panel.plan.length] === a)))) continue;
      const v = [[a[0], ceiling, a[1]], [a[0], cut, a[1]], [b[0], cut, b[1]], [b[0], ceiling, b[1]]];
      if (new Triangle(new Vector3(...v[0]!), new Vector3(...v[1]!), new Vector3(...v[2]!)).getNormal(new Vector3()).dot(front.n) > 0) v.reverse(); metal.quad(v[0]!, v[1]!, v[2]!, v[3]!, 0x354348);
    }
    const profile: Plan[] = [[back, ceiling], [.005, ceiling], [.005, high], [.075, high], [.075, cut - .065], [.025, cut - .065], [.025, cut], [depth(front, endAnchors.get(front)!), cut], [back, cut]];
    triangulate(profile, p => { const v = p.map(([d, y]) => { const point = endPoint(front, d); return [point[0], y, point[1]]; }); if (new Triangle(new Vector3(...v[0]!), new Vector3(...v[1]!), new Vector3(...v[2]!)).getNormal(new Vector3()).dot(front.u) < 0) v.reverse(); metal.triangle(v[0]!, v[1]!, v[2]!, 0x3b4649); });
  }
  for (const panel of rear) {
    surface(rooms, panel.plan, cut, panel.color, true); surface(rooms, panel.plan, ceiling, panel.color, false);
    for (let i = 0; i < panel.plan.length; i++) {
      const a = panel.plan[i]!, b = panel.plan[(i + 1) % panel.plan.length]!, front = fronts[panel.side];
      if (panel.sharedEdges?.some(([u, v]) => (a === u && b === v) || (a === v && b === u))) continue;
      if (Math.abs(depth(front, a) - back) < 1e-10 && Math.abs(depth(front, b) - back) < 1e-10) continue;
      rooms.quad([a[0], ceiling, a[1]], [a[0], cut, a[1]], [b[0], cut, b[1]], [b[0], ceiling, b[1]], panel.color);
    }
  }
}
