import type { Matrix4, Vector3 } from 'three';
import type { LocalFootEngine, LocalRigInput } from '../local-walk-gait.js';
import type { LocalRig } from '../../render/local-walk-rig.js';
import type { Vertex } from '../../render/local-differential/data.js';
export interface OrderedScenePose { valid: boolean; mats?: Matrix4[]; point?: (vertex: Vertex) => Vector3; solves: unknown[] }
export interface OrderedFootEngine extends LocalFootEngine {
  scenePose(rig: LocalRig['d'], source: LocalRig['source'], state: any, input: LocalRigInput): OrderedScenePose;
}
export function createOrderedFootEngine(floor: (x: number, z: number) => { y: number; patch: { id: string } }): OrderedFootEngine;

