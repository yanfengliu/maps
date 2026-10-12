import type { SpawnOptions } from 'node:child_process';
export interface ExtractionResult {
  pid: number | null;
  exitCode: number | null;
  completed: boolean;
  closure?: { helperPid: number; result: { pid: number | null; exitCode: number | null; aborted: boolean; jobEmpty: boolean; activeAtClosure: number | null; totalProcesses: number; maxActive: number; handlesClosed: boolean; closedHandles: number; assignedAtCreation: boolean; assignedBeforeResume: boolean; resumed: boolean; processExited: boolean; normalExitDescendantsStopped: boolean; terminateJobCalls: number; terminateProcessCalls: number; attributeListDisposed: boolean; error: string | null } };
}
export function runExtractionProcess(executable: string, args: string[], options: SpawnOptions, owned: string, cutoffs?: { timeoutMs?: number; cleanupMs?: number }): Promise<ExtractionResult>;
export function extractReference(project: string, outputRelative: string, blender: string): Promise<void>;
export function extractionPowerShell(): string;
