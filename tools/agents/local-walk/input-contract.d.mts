export interface InputPin { readonly path: string; readonly sha256: string; readonly bytes?: number }
export const HISTORICAL_HERO_INPUTS: readonly InputPin[];
export const HISTORICAL_OBSTACLE_INPUTS: readonly InputPin[];
export const NETWORK_INPUT: InputPin;
export const FEMALE_INPUTS: readonly InputPin[];
export const REFERENCE_INPUTS: readonly InputPin[];
export const CURRENT_OWNER_INPUTS: readonly InputPin[];
export const FEMALE_SOURCE_INPUT: InputPin;
export const BAKER_INPUT: InputPin;
