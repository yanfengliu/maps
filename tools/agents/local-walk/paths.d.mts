import type { InputPin } from './input-contract.mjs';
export function sha256(bytes: Uint8Array): string;
export function projectPath(project: string, relative: string): string;
export function ownedDataPath(project: string, relative: string): string;
export function createUnusedOutput(project: string, relative: string): string;
export function readPinned(project: string, binding: InputPin): Buffer;
export function sourcePath(relative: string): string;
