import type { InputPin } from './input-contract.mjs';
export interface InputProfile {
  readonly id: string;
  readonly heroInputs: readonly InputPin[];
  readonly obstacleInputs: readonly InputPin[];
  readonly networkInput: InputPin;
  readonly codeInputs: readonly InputPin[];
  readonly ownerInputs: readonly InputPin[];
  readonly productionReady: false;
  readonly normalAdoption: 'withheld';
  readonly caveats: readonly string[];
}
export const CURRENT_776_PROFILE: InputProfile;
export const FRESH_1695_PROFILE: InputProfile;
export function inputProfile(name?: string): InputProfile;
export function assertInputProfile(project: string, name?: string): (InputPin & { bytes: number })[];
