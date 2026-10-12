export interface PreparationOptions { project: string; profile: string; blender?: string }
export interface PreparationResult { status: 'verified-existing' | 'prepared'; directory: string; files: number; bytes: number; productionReady: false }
export function ensureLocalWalk(options: PreparationOptions): Promise<PreparationResult>;
