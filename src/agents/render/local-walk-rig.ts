import { Matrix4, Vector3 } from 'three';
import type { AgentAssetLod } from '../../world/agent-assets.js';
import type { Source, Vertex } from './local-differential/data.js';

/** Private source sidecar, never a public delivered-asset schema. */
export interface LocalRigPacket {
  id: string; lod: AgentAssetLod; source: Source; frames: number[][][];
  jointNames: string[]; parents: (number | null)[]; bones: Record<string, number>[];
  soles: number[][]; shoes: number[];
}
export function createLocalRig(packet: LocalRigPacket) {
  if (packet.frames.length !== 48 || packet.frames.some(f => f.length !== 53 || f.some(m => m.length !== 16 || !m.every(Number.isFinite)))) throw Error('Local female rig requires the complete 48 source frames and 53 finite joints.');
  const frames = packet.frames.map(f => f.map(m => new Matrix4().fromArray(m))), worlds = frames[32]!;
  if (JSON.stringify(worlds.flatMap(m => m.toArray())) !== JSON.stringify(packet.source.referencePalette)) throw Error('Female reference palette disagrees with its actual idle source frame.');
  const byId = new Map(packet.source.vertices.map(v => [v.id, v]));
  const skin = (v: Vertex, mats = worlds): Vector3 => {
    const p = new Vector3();
    for (const t of v.influences) p.addScaledVector(new Vector3(...t.point).applyMatrix4(mats[t.joint]!), t.weight);
    return p;
  };
  const reference = new Map(packet.source.vertices.map(v => [v.id, skin(v)]));
  const d = {
    g: { nodes: packet.jointNames.map(name => ({ name })) }, parents: packet.parents.map(p => p ?? undefined), worlds, bones: packet.bones,
    sample(phase: number, id: number, clip = 'idle'): Vector3 {
      if (phase !== 0 || clip !== 'idle') throw Error('Local rig point adapter accepts only the immutable original idle term.');
      const v = byId.get(id); if (!v) throw Error('Absent actual female VAT ID ' + id); return new Vector3(...v.idle);
    },
    skin(v: Vertex, mats = worlds): Vector3 { return mats === worlds ? reference.get(v.id)!.clone() : skin(v, mats); },
  };
  const source = { jointNodes: packet.jointNames.map((_, i) => i), worldsAt(clip: string, phase: number) {
    if (clip !== 'walk' && clip !== 'idle') throw Error('Local rig source clip must be walk or idle.');
    const first = clip === 'walk' ? 0 : 32, count = clip === 'walk' ? 32 : 16, f = ((phase % 1) + 1) % 1 * count, a = Math.floor(f), t = f - a;
    return { worlds: frames[first + a]!.map((m, j) => new Matrix4().fromArray(m.elements.map((v, k) => v + t * (frames[first + (a + 1) % count]![j]!.elements[k]! - v)))) };
  } };
  return { packet, d, source, byId };
}
export type LocalRig = ReturnType<typeof createLocalRig>;

