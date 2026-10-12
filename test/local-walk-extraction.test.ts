/** Bound: Windows10+ owned-job closure with Node fixtures; public Node abort latch. No Blender or scene generation. */
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { runExtractionProcess, extractionPowerShell, type ExtractionResult } from '../tools/agents/local-walk/extract-launch.mjs';

const extractionDirectory = fileURLToPath(new URL('../tools/agents/local-walk/', import.meta.url));
const helperSource = fs.readFileSync(path.join(extractionDirectory, 'extract-windows.ps1'), 'utf8');
const launcherSource = fs.readFileSync(path.join(extractionDirectory, 'extract-launch.mjs'));
const powershell = process.platform === 'win32' ? extractionPowerShell() : '';
const owned: string[] = [];
function fixture(): string { const directory = fs.realpathSync.native(fs.mkdtempSync(path.join(tmpdir(), 'maps-extract-819-'))); owned.push(directory); return directory; }
function removeOwned(directory: string): void {
  const files: string[] = [], directories: string[] = [];
  const visit = (current: string): void => {
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('Extraction fixture cleanup refuses linked directory ' + current);
    directories.push(current);
    for (const name of fs.readdirSync(current)) {
      const file = path.join(current, name), info = fs.lstatSync(file);
      if (info.isSymbolicLink()) throw Error('Extraction fixture cleanup refuses linked entry ' + file);
      if (info.isDirectory()) visit(file); else if (info.isFile()) files.push(file); else throw Error('Extraction fixture cleanup cannot classify ' + file);
    }
  };
  visit(directory);
  for (const file of files) fs.unlinkSync(file);
  for (const child of directories.sort((a, b) => b.length - a.length)) fs.rmdirSync(child);
}
afterEach(() => {
  for (const directory of owned.splice(0)) {
    const evidence = process.env['MAPS_EXTRACT_CONTROL_EVIDENCE'];
    if (evidence) {
      const target = path.join(evidence, path.basename(directory));
      fs.mkdirSync(target, { recursive: true });
      // Retain individual raw records and controlled source, never rewrite run metadata.
      for (const name of fs.readdirSync(directory)) {
        const file = path.join(directory, name), info = fs.lstatSync(file);
        if (info.isSymbolicLink()) throw Error('Extraction evidence refuses linked entry ' + file);
        if (info.isFile()) fs.copyFileSync(file, path.join(target, name), fs.constants.COPYFILE_EXCL);
      }
    }
    removeOwned(directory);
  }
});
function options(directory: string) { return { cwd: directory, windowsHide: true, stdio: 'ignore' as const, env: { ...process.env, TEMP: directory, TMP: directory, NODE_DISABLE_COMPILE_CACHE: '1', EXTRACTION_QUOTED_ENV: '日本語 "value" \\ trailing\\' } }; }
function childArguments(code: string): string[] { return ['-e', code]; }
function treeCode(directory: string, parentExits: boolean): string {
  const marker = path.join(directory, 'grandchild.json');
  const grandchild = `require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid:process.pid}));${parentExits ? 'setInterval(()=>{},1000)' : 'setTimeout(()=>process.exit(0),120)'};`;
  // Detached prevents Node's own per-parent job from closing the grandchild. The extraction job still contains it.
  return `const cp=require('node:child_process'),fs=require('node:fs');const child=cp.spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{windowsHide:true,stdio:'ignore',detached:true});${parentExits ? `const timer=setInterval(()=>{if(fs.existsSync(${JSON.stringify(marker)})){clearInterval(timer);process.exit(0)}},5);` : "child.once('exit',()=>process.exit(0));"}`;
}
function assertClosed(value: ExtractionResult): void {
  expect(value.closure?.result.jobEmpty).toBe(true);
  expect(value.closure?.result.activeAtClosure).toBe(0);
  expect(value.closure?.result.handlesClosed).toBe(true);
  expect(value.closure?.result.attributeListDisposed).toBe(true);
}
function errorResult(error: unknown): ExtractionResult { return (error as Error & { extraction: ExtractionResult }).extraction; }
async function closeHeld(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([new Promise<void>(resolve => child.once('close', () => resolve())), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Owned fixture helper did not close within5s')), 5000); })]); } finally { clearTimeout(timer); }
}
async function directHelper(directory: string, source: string, executable: string, args: string[], cancellation?: string): Promise<Record<string, unknown>> {
  const helper = path.join(directory, 'controlled-helper.ps1'), specification = path.join(directory, 'specification.json'), closure = path.join(directory, 'closure.json'), cancel = path.join(directory, 'cancel.txt');
  fs.writeFileSync(helper, source, { flag: 'wx' });
  if (cancellation) fs.writeFileSync(cancel, cancellation, { flag: 'wx' });
  fs.writeFileSync(specification, JSON.stringify({ executable, arguments: args, cwd: directory, cancelPath: cancel, closurePath: closure, timeoutMs: 8000, cleanupMs: 1000 }), { flag: 'wx' });
  const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', helper, '-SpecificationPath', specification], { ...options(directory), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = ''; child.stdout?.on('data', bytes => { stdout += String(bytes); }); child.stderr?.on('data', bytes => { stderr += String(bytes); });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([new Promise<void>((resolve, reject) => { child.once('error', reject); child.once('close', () => resolve()); }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Owned direct-helper fixture exceeded12s')), 12000); })]);
    if (!fs.existsSync(closure)) throw Error('Controlled helper refused without closure: ' + stderr);
    return JSON.parse(fs.readFileSync(closure, 'utf8')) as Record<string, unknown>;
  } finally { clearTimeout(timer); await closeHeld(child); fs.writeFileSync(path.join(directory, 'direct-helper-stdout.log'), stdout, { flag: 'wx' }); fs.writeFileSync(path.join(directory, 'direct-helper-stderr.log'), stderr, { flag: 'wx' }); }
}

async function controlledLauncher(directory: string, helper: string): Promise<typeof runExtractionProcess> {
  // Execute identical public Node bytes against a controlled helper in this single fixture.
  // The private source overlay can name the reviewed prerequisite directory; an ordinary checkout uses its own tools.
  const prerequisiteDirectory = process.env['MAPS_EXTRACT_CONTROL_PREREQUISITES'] ?? extractionDirectory;
  fs.writeFileSync(path.join(directory, 'extract-launch.mjs'), launcherSource, { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'extract-windows.ps1'), helper, { flag: 'wx' });
  for (const name of ['paths.mjs', 'input-contract.mjs']) fs.copyFileSync(path.join(prerequisiteDirectory, name), path.join(directory, name), fs.constants.COPYFILE_EXCL);
  return (await import(/* @vite-ignore */ pathToFileURL(path.join(directory, 'extract-launch.mjs')).href)).runExtractionProcess as typeof runExtractionProcess;
}

async function observerOfSuspendedChild(marker: string, directory: string): Promise<{ child: ChildProcess; completion: Promise<{ pid: number; createdUtc: string; exited: boolean; handleDisposed: boolean }> }> {
  const receipt = path.join(directory, 'held-child-observer.json');
  const quote = (value: string): string => "'" + value.replaceAll("'", "''") + "'";
  const code = `$ErrorActionPreference='Stop';try{$row=Get-Content -LiteralPath ${quote(marker)} -Raw | ConvertFrom-Json;$p=[Diagnostics.Process]::GetProcessById([int]$row.pid);try{$h=$p.SafeHandle;$created=$p.StartTime.ToUniversalTime().ToString('o');$expected=if($row.createdUtc -is [DateTime]){$row.createdUtc.ToUniversalTime().Ticks}else{[DateTimeOffset]::Parse([string]$row.createdUtc).UtcTicks};if([DateTimeOffset]::Parse($created).UtcTicks -ne $expected){throw 'Suspended fixture identity changed'};$closed=$p.WaitForExit(10000)}finally{$p.Dispose()};[IO.File]::WriteAllText(${quote(receipt)},([ordered]@{pid=$row.pid;createdUtc=$created;exited=$closed;handleDisposed=$true}|ConvertTo-Json));if(-not $closed){exit 1}}catch{[IO.File]::WriteAllText(${quote(path.join(directory, 'held-child-observer-error.log'))},[string]$_);exit 1}`;
  const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', code], options(directory));
  const completion = new Promise<{ pid: number; createdUtc: string; exited: boolean; handleDisposed: boolean }>((resolve, reject) => { child.once('error', reject); child.once('close', code => { try { if (code !== 0) throw Error('Held suspended-child observer refused ' + code); resolve(JSON.parse(fs.readFileSync(receipt, 'utf8'))); } catch (error) { reject(error); } }); });
  void completion.catch(() => {}); // Preserve refusal for the caller while it awaits extraction cleanup.
  return { child, completion };
}

describe.skipIf(process.platform !== 'win32')('Windows extraction ownership (platform bound)', () => {
  it('preserves quoted argv/environment and actual child identity before ordinary success', async () => {
    const directory = fixture(), observed = path.join(directory, 'arguments.json');
    const argumentsToKeep = ['space value', 'embedded"quote', 'trailing\\', '日本語'];
    const code = `require('node:fs').writeFileSync(${JSON.stringify(observed)},JSON.stringify({pid:process.pid,args:process.argv.slice(1),env:process.env.EXTRACTION_QUOTED_ENV}));`;
    const value = await runExtractionProcess(process.execPath, ['-e', code, '--', ...argumentsToKeep], options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 });
    const actual = JSON.parse(fs.readFileSync(observed, 'utf8')) as { pid: number; args: string[]; env: string };
    expect(value.pid).toBe(actual.pid); expect(value.pid).not.toBe(value.closure?.helperPid); expect(actual.args).toEqual(argumentsToKeep); expect(actual.env).toBe(options(directory).env.EXTRACTION_QUOTED_ENV);
    expect(value.completed).toBe(true); expect(value.exitCode).toBe(0); expect(value.closure?.result.assignedAtCreation).toBe(true); expect(value.closure?.result.assignedBeforeResume).toBe(true); expect(value.closure?.result.closedHandles).toBe(6); assertClosed(value);
  }, 15000);

  it('contains a real child and grandchild until normal completion', async () => {
    const directory = fixture();
    const value = await runExtractionProcess(process.execPath, childArguments(treeCode(directory, false)), options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 });
    expect(value.completed).toBe(true); expect(value.closure?.result.totalProcesses).toBeGreaterThanOrEqual(2); expect(value.closure?.result.maxActive).toBeGreaterThanOrEqual(2); assertClosed(value);
  }, 15000);

  it('closes a still-running descendant after its parent exits first', async () => {
    const directory = fixture();
    const value = await runExtractionProcess(process.execPath, childArguments(treeCode(directory, true)), options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 });
    expect(value.completed).toBe(true); expect(value.exitCode).toBe(0); expect(value.closure?.result.totalProcesses).toBeGreaterThanOrEqual(2); expect(value.closure?.result.normalExitDescendantsStopped).toBe(true); assertClosed(value);
  }, 15000);

  it('refuses timeout after closing the actual owned tree', async () => {
    const directory = fixture();
    const code = treeCode(directory, true).replace('process.exit(0)', 'setInterval(()=>{},1000)');
    let failure: unknown;
    try { await runExtractionProcess(process.execPath, childArguments(code), options(directory), directory, { timeoutMs: 4000, cleanupMs: 1000 }); } catch (error) { failure = error; }
    expect(String(failure)).toContain('timed out'); const value = errorResult(failure); expect(value.completed).toBe(false); expect(value.closure?.result.totalProcesses).toBeGreaterThanOrEqual(2); assertClosed(value);
  }, 15000);

  it('latches the first interruption across repeated SIGINT/SIGTERM callbacks', async () => {
    const directory = fixture(), marker = path.join(directory, 'ready.json');
    const code = `require('node:fs').writeFileSync(${JSON.stringify(marker)},'{}');setInterval(()=>{},1000);`;
    const signal = setInterval(() => { if (fs.existsSync(marker)) { process.emit('SIGINT'); process.emit('SIGINT'); process.emit('SIGTERM'); } }, 10);
    let failure: unknown;
    try { await runExtractionProcess(process.execPath, childArguments(code), options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 }); } catch (error) { failure = error; } finally { clearInterval(signal); }
    expect(String(failure)).toContain('interrupted by SIGINT'); const value = errorResult(failure); expect(value.completed).toBe(false); expect(value.closure?.result.terminateJobCalls).toBe(1); expect(value.closure?.result.closedHandles).toBe(6); assertClosed(value);
  }, 15000);

  it('refuses missing executable without starting an unowned child', async () => {
    const directory = fixture(); let failure: unknown;
    try { await runExtractionProcess(path.join(directory, 'absent.exe'), [], options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 }); } catch (error) { failure = error; }
    expect(String(failure)).toContain('suspended child creation'); const value = errorResult(failure); expect(value.completed).toBe(false); expect(value.pid).toBe(null); expect(value.closure?.result.totalProcesses).toBe(0); assertClosed(value);
  }, 15000);

  it('refuses failed atomic job setup without any child creation', async () => {
    const directory = fixture();
    const mutated = helperSource.replace('if(!UpdateProcThreadAttribute(attributes,0,new UIntPtr(0x2000D)', 'if(!UpdateProcThreadAttribute(attributes,1,new UIntPtr(0x2000D)');
    expect(mutated).not.toBe(helperSource);
    const receipt = await directHelper(directory, mutated, process.execPath, childArguments('process.exit(0)'));
    const result = receipt['result'] as { pid: number | null; error: string; totalProcesses: number; jobEmpty: boolean; handlesClosed: boolean };
    expect(result.error).toContain('creation job list'); expect(result.pid).toBe(null); expect(result.totalProcesses).toBe(0); expect(result.jobEmpty).toBe(true); expect(result.handlesClosed).toBe(true);
  }, 15000);

  it('refuses failed resume and closes the atomically assigned suspended child', async () => {
    const directory = fixture(), body = path.join(directory, 'must-not-run');
    const mutated = helperSource.replace('if(ResumeThread(child.thread)!=1)', 'if(ResumeThread(IntPtr.Zero)!=1)');
    expect(mutated).not.toBe(helperSource);
    const receipt = await directHelper(directory, mutated, process.execPath, childArguments(`require('node:fs').writeFileSync(${JSON.stringify(body)},'ran')`));
    const result = receipt['result'] as { error: string; assignedAtCreation: boolean; resumed: boolean; processExited: boolean; jobEmpty: boolean; activeAtClosure: number; handlesClosed: boolean };
    expect(result.error).toContain('resume'); expect(result.assignedAtCreation).toBe(true); expect(result.resumed).toBe(false); expect(result.processExited).toBe(true); expect(result.jobEmpty).toBe(true); expect(result.activeAtClosure).toBe(0); expect(result.handlesClosed).toBe(true); expect(fs.existsSync(body)).toBe(false);
  }, 15000);

  it('never accepts completion after an abort even when the actual child exits zero', async () => {
    const directory = fixture(), marker = path.join(directory, 'ready.json');
    const controlled = helperSource.replaceAll('TerminateJobObject(job,1)', 'TerminateJobObject(job,0)');
    expect(controlled).not.toBe(helperSource);
    const run = await controlledLauncher(directory, controlled);
    const signal = setInterval(() => { if (fs.existsSync(marker)) process.emit('SIGINT'); }, 10);
    let failure: unknown;
    try { await run(process.execPath, childArguments(`require('node:fs').writeFileSync(${JSON.stringify(marker)},'{}');setInterval(()=>{},1000)`), options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 }); } catch (error) { failure = error; } finally { clearInterval(signal); }
    expect(String(failure)).toContain('interrupted by SIGINT'); const value = errorResult(failure); expect(value.exitCode).toBe(0); expect(value.completed).toBe(false); assertClosed(value);
  }, 15000);

  it.each(['missing', 'malformed', 'nonempty'] as const)('refuses a %s owned closure record even after child exit zero', async kind => {
    const directory = fixture();
    const controlled = kind === 'missing' ? helperSource.replace('$taskStream.Write($taskBytes,0,$taskBytes.Length)', '') : kind === 'malformed' ? helperSource.replace('$taskStream.Write($taskBytes,0,$taskBytes.Length)', '$taskStream.WriteByte(123)') : helperSource.replace('$taskReceipt=[ordered]', '$taskResult.jobEmpty=$false\n$taskReceipt=[ordered]');
    expect(controlled).not.toBe(helperSource);
    const run = await controlledLauncher(directory, controlled); let failure: unknown;
    try { await run(process.execPath, childArguments('process.exit(0)'), options(directory), directory, { timeoutMs: 8000, cleanupMs: 1000 }); } catch (error) { failure = error; }
    expect(String(failure)).toContain('owned closure'); expect(errorResult(failure).completed).toBe(false);
  }, 15000);

  it('closes an atomically assigned suspended child when the held helper is killed during initialization', async () => {
    const directory = fixture(), marker = path.join(directory, 'suspended-child.json'), body = path.join(directory, 'must-not-run');
    const pause = `File.WriteAllText(${JSON.stringify(marker)},"{\\\"pid\\\":"+child.pid+",\\\"createdUtc\\\":\\\""+result.createdUtc+"\\\"}");Thread.Sleep(20000);`;
    const controlled = helperSource.replace('result.assignedBeforeResume=true;', 'result.assignedBeforeResume=true;' + pause);
    expect(controlled).not.toBe(helperSource);
    const run = await controlledLauncher(directory, controlled);
    let observer: Awaited<ReturnType<typeof observerOfSuspendedChild>> | undefined, failure: unknown;
    const extraction = run(process.execPath, childArguments(`require('node:fs').writeFileSync(${JSON.stringify(body)},'ran')`), options(directory), directory, { timeoutMs: 5000, cleanupMs: 1000 }).catch(error => { failure = error; });
    try {
      const deadline = Date.now() + 4000;
      while (!fs.existsSync(marker) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
      expect(fs.existsSync(marker)).toBe(true);
      observer = await observerOfSuspendedChild(marker, directory);
      await extraction;
      const observed = await observer.completion;
      expect(observed.exited).toBe(true); expect(observed.handleDisposed).toBe(true); expect(fs.existsSync(body)).toBe(false); expect(String(failure)).toContain('owned tree closure unconfirmed'); expect(errorResult(failure).completed).toBe(false);
    } finally { await extraction; if (observer) await closeHeld(observer.child); }
  }, 20000);

  it('names missing Windows host recovery before any process or specification', async () => {
    const directory = fixture(), prior = process.env['PATH'];
    try { process.env['PATH'] = directory; await expect(runExtractionProcess(process.execPath, [], options(directory), directory)).rejects.toThrow('add its directory to PATH'); expect(fs.readdirSync(directory)).toEqual([]); } finally { process.env['PATH'] = prior; }
  });

  it('refuses an older PowerShell host before native job or child creation', async () => {
    const directory = fixture(), body = path.join(directory, 'must-not-run');
    const controlled = helperSource.replace('$PSVersionTable.PSVersion.Major -lt 7', '$PSVersionTable.PSVersion.Major -lt 100');
    expect(controlled).not.toBe(helperSource);
    await expect(directHelper(directory, controlled, process.execPath, childArguments(`require('node:fs').writeFileSync(${JSON.stringify(body)},'ran')`))).rejects.toThrow('requires PowerShell7 or newer');
    expect(fs.existsSync(body)).toBe(false); expect(fs.existsSync(path.join(directory, 'closure.json'))).toBe(false);
  }, 15000);
});

describe('Extraction finite cutoff admission', () => {
  it.each([0, -1, 180001, Number.POSITIVE_INFINITY])('rejects invalid timeout %s before any child', async timeoutMs => {
    const directory = fixture(); await expect(runExtractionProcess(process.execPath, [], options(directory), directory, { timeoutMs })).rejects.toThrow('finite180s/10s'); expect(fs.readdirSync(directory)).toEqual([]);
  });
});
