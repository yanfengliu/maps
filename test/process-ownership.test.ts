/** Bounds: fake CIM snapshots only. Recycled parent PIDs, exited parents and
 * changed executable identities must never produce cleanup eligibility. No test
 * enumerates or terminates real processes; live cleanup requires separate review.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const launch="2026-09-12T23:22:18Z";
const node="C:\\runtime\\node.exe",chrome="C:\\playwright\\chrome-headless-shell.exe";
const processRow=(pid:number,parent:number,time:string,executable=node)=>({ProcessId:pid,ParentProcessId:parent,CreationDate:time,Name:executable.split("\\").at(-1)!,ExecutablePath:executable});
const root=processRow(35916,777,launch);
function classify(processes:ReturnType<typeof processRow>[],known=[root],allowed=[node,chrome]):number[]{
  const command="$ErrorActionPreference = 'Stop'; . ./tools/visual/process-ownership.ps1; $case = [Console]::In.ReadToEnd() | ConvertFrom-Json; $rows = @(Get-MapsOwnedProcessSnapshot -Processes $case.processes -KnownIdentities $case.known -StartedAt $case.started -AllowedExecutables $case.allowed); ConvertTo-Json -InputObject @($rows | ForEach-Object { $_.ProcessId }) -Compress";
  // Process-local policy permits this checked-in pure helper; no machine policy
  // is changed. Stop on loading errors so a missing helper cannot look like [].
  const output=execFileSync("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",command],{input:JSON.stringify({processes,known,started:launch,allowed}),encoding:"utf8",timeout:15000,windowsHide:true});
  return JSON.parse(output) as number[];
}
describe.skipIf(process.platform !== "win32")("visual process ownership (Windows CIM; visibly skipped elsewhere)",()=>{
  it("admits an observed live parent chain and preserves a known orphan identity",()=>{
    const child=processRow(20264,35916,"2026-09-12T23:22:19Z");
    const browser=processRow(200,20264,"2026-09-12T23:22:20Z",chrome);
    expect(classify([root,child,browser])).toEqual([200,20264,35916]);
    expect(classify([browser],[root,child,browser])).toEqual([200]);
  });
  it("rejects the actual older Windows descendants of recycled PID20264",()=>{
    const child=processRow(20264,35916,"2026-09-12T23:22:19Z");
    const rows=[processRow(8812,20264,"2026-09-12T15:13:28Z","C:\\Windows\\System32\\csrss.exe"),processRow(4624,20264,"2026-09-12T15:13:28Z","C:\\Windows\\System32\\winlogon.exe"),processRow(26020,4624,"2026-09-12T15:13:28Z","C:\\Windows\\System32\\fontdrvhost.exe"),processRow(11712,4624,"2026-09-12T15:13:28Z","C:\\Windows\\System32\\dwm.exe")];
    // Replay the rejected wrapper's PID-only closure on these exact fake rows.
    const all=[root,child,...rows],oldOwned=new Set([root.ProcessId]);
    let changed=true;
    while(changed){changed=false;for(const row of all)if(oldOwned.has(row.ParentProcessId)&&!oldOwned.has(row.ProcessId)){oldOwned.add(row.ProcessId);changed=true;}}
    expect(rows.every(row=>oldOwned.has(row.ProcessId))).toBe(true);
    expect(classify([root,child,...rows])).toEqual([20264,35916]);
  });
  it("rejects an older allowed executable even if its parent PID matches",()=>{
    expect(classify([root,processRow(9,35916,"2026-09-12T20:00:00Z",chrome)])).toEqual([35916]);
  });
  it("rejects a younger child of an exited parent and of a reused parent identity",()=>{
    const oldParent=processRow(20264,35916,"2026-09-12T23:22:19Z");
    const unrelated=processRow(20264,888,"2026-09-12T23:23:00Z");
    const younger=processRow(900,20264,"2026-09-12T23:23:01Z",chrome);
    expect(classify([root,younger],[root,oldParent])).toEqual([35916]);
    expect(classify([root,unrelated,younger],[root,oldParent])).toEqual([35916]);
  });
  it("rejects a known PID with a changed executable identity",()=>{
    const child=processRow(20264,35916,"2026-09-12T23:22:19Z");
    const changed={...child,ParentProcessId:888,ExecutablePath:"C:\\other\\node.exe"};
    expect(classify([root,changed],[root,child])).toEqual([35916]);
  });
  it("normalizes configured Windows absolute path spelling without accepting another path or a basename",()=>{
    const allowedCmd="C:\\WINDOWS\\System32\\cmd.exe";
    const cmd=processRow(400,35916,"2026-09-12T23:22:19Z","C:\\Windows\\System32\\cmd.exe");
    const variant={...cmd,ExecutablePath:"c:/windows/System32/./cmd.exe"};
    expect(classify([root,cmd],[root],[node,allowedCmd])).toEqual([400,35916]);
    expect(classify([root,variant],[root,cmd],[node,allowedCmd])).toEqual([400,35916]);
    for(const path of ["C:\\other\\cmd.exe","C:\\Windows\\System32-other\\cmd.exe","cmd.exe","C:cmd.exe","\\\\?\\C:\\Windows\\System32\\cmd.exe"]){
      expect(classify([root,{...cmd,ExecutablePath:path}],[root,cmd],[node,allowedCmd])).toEqual([35916]);
    }
  });
});
