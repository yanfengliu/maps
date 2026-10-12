# One Windows extraction tree. No PID search/kill and no breakaway permission.
param([Parameter(Mandatory=$true)][string]$SpecificationPath)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSVersion.Major -lt 7){throw 'Extraction helper requires PowerShell7 or newer; put that host directory first on PATH, preserve this diagnostic directory and retry a fresh owned extraction output'}
$taskSpec=Get-Content -LiteralPath $SpecificationPath -Raw | ConvertFrom-Json
if($taskSpec.timeoutMs -le 0 -or $taskSpec.cleanupMs -le 0 -or $taskSpec.timeoutMs -gt 180000 -or $taskSpec.cleanupMs -gt 10000){throw 'Extraction helper requires finite180s/10s maximum deadlines'}
if([IO.File]::Exists($taskSpec.closurePath)){throw 'Extraction helper closure output already exists'}
$taskScriptSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Threading;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class MapsExtractionJob {
  [StructLayout(LayoutKind.Sequential)] struct BasicLimits { public long processTime,jobTime; public uint flags; public UIntPtr minimum,maximum; public uint activeLimit; public UIntPtr affinity; public uint priority,scheduling; }
  [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits { public BasicLimits basic; public IoCounters io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
  [StructLayout(LayoutKind.Sequential)] struct Accounting { public long a,b,c,d; public uint faults,total,active,terminated; }
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup { public uint cb; public string reserved,desktop,title; public uint x,y,width,height,xChars,yChars,fill,flags; public short show,reservedSize; public IntPtr reservedBytes,input,output,error; }
  [StructLayout(LayoutKind.Sequential)] struct StartupEx { public Startup startup; public IntPtr attributes; }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process,thread; public uint pid,tid; }
  [StructLayout(LayoutKind.Sequential)] struct FileTime { public uint low,high; }
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObjectW(IntPtr attributes,string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int info,ref ExtendedLimits value,uint length);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job,int info,out Accounting value,uint length,IntPtr returned);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool IsProcessInJob(IntPtr process,IntPtr job,out bool contained);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,uint count,uint flags,ref UIntPtr bytes);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,UIntPtr key,IntPtr value,UIntPtr size,IntPtr previous,IntPtr returned);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateJobObject(IntPtr job,uint code);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessW(string executable,StringBuilder command,IntPtr processAttributes,IntPtr threadAttributes,bool inherit,uint flags,IntPtr environment,string cwd,ref StartupEx startup,out ProcessInfo process);
  [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll",SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetProcessTimes(IntPtr process,out FileTime created,out FileTime exit,out FileTime kernel,out FileTime user);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetHandleInformation(IntPtr handle,out uint flags);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
  [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr GetStdHandle(int which);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool DuplicateHandle(IntPtr sourceProcess,IntPtr source,IntPtr targetProcess,out IntPtr target,uint access,bool inherit,uint options);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string path,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);

  public sealed class Result {
    public int? pid; public long? exitCode; public string createdUtc,error,abortReason;
    public bool aborted,assignedAtCreation,assignedBeforeResume,resumed,processExited,jobEmpty,handlesClosed,jobHandleNonInheritable,attributeListDisposed;
    public uint? activeAtClosure; public uint totalProcesses,maxActive; public int terminateJobCalls,terminateProcessCalls,closedHandles;
    public long elapsedMs; public bool normalExitDescendantsStopped;
  }
  static Exception Failure(string operation) { return new Win32Exception(Marshal.GetLastWin32Error(),"Extraction "+operation+" failed"); }
  static Accounting ReadJob(IntPtr job,Result result) {
    Accounting value;
    if(!QueryInformationJobObject(job,1,out value,(uint)Marshal.SizeOf(typeof(Accounting)),IntPtr.Zero)) throw Failure("job accounting");
    result.totalProcesses=value.total; result.maxActive=Math.Max(result.maxActive,value.active); return value;
  }
  static string Quote(string value) {
    var text=new StringBuilder("\""); int slashes=0;
    foreach(char c in value) { if(c=='\\'){slashes++;continue;} if(c=='\"'){text.Append('\\',slashes*2+1).Append(c);}else{text.Append('\\',slashes).Append(c);} slashes=0; }
    return text.Append('\\',slashes*2).Append('"').ToString();
  }
  static void Close(ref IntPtr handle,Result result) {
    if(handle==IntPtr.Zero || handle==new IntPtr(-1)) return;
    IntPtr owned=handle;handle=IntPtr.Zero;
    if(!CloseHandle(owned)) throw Failure("owned handle close");
    result.closedHandles++;
  }
  public static Result Run(string executable,string[] arguments,string cwd,string cancelPath,int timeoutMs,int cleanupMs) {
    var result=new Result();var clock=Stopwatch.StartNew();IntPtr job=IntPtr.Zero,input=IntPtr.Zero,output=IntPtr.Zero,error=IntPtr.Zero,attributes=IntPtr.Zero,jobValues=IntPtr.Zero,standardValues=IntPtr.Zero;var child=new ProcessInfo();bool assigned=false,attributesInitialized=false;bool stopRequested=false;long closeStarted=-1;
    try {
      job=CreateJobObjectW(IntPtr.Zero,null);if(job==IntPtr.Zero)throw Failure("job creation");
      uint handleFlags;if(!GetHandleInformation(job,out handleFlags))throw Failure("job handle inspection");
      result.jobHandleNonInheritable=(handleFlags&1)==0;if(!result.jobHandleNonInheritable)throw new Exception("Extraction job handle is inheritable");
      var limits=new ExtendedLimits();limits.basic.flags=0x2000;
      if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(typeof(ExtendedLimits))))throw Failure("job limits");
      if(File.Exists(cancelPath)){result.aborted=true;result.abortReason=File.ReadAllText(cancelPath);throw new Exception("Extraction aborted before child creation: "+result.abortReason);}
      var current=GetCurrentProcess();
      if(!DuplicateHandle(current,GetStdHandle(-11),current,out output,0,true,2))throw Failure("stdout duplication");
      if(!DuplicateHandle(current,GetStdHandle(-12),current,out error,0,true,2))throw Failure("stderr duplication");
      IntPtr nullInput=CreateFileW("NUL",0x80000000,3,IntPtr.Zero,3,0,IntPtr.Zero);if(nullInput==new IntPtr(-1))throw Failure("NUL input");
      try{if(!DuplicateHandle(current,nullInput,current,out input,0,true,2))throw Failure("stdin duplication");}finally{if(!CloseHandle(nullInput))throw Failure("NUL input close");}
      UIntPtr attributeBytes=UIntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,2,0,ref attributeBytes);if(attributeBytes==UIntPtr.Zero)throw Failure("attribute sizing");
      attributes=Marshal.AllocHGlobal((IntPtr)attributeBytes.ToUInt64());
      if(!InitializeProcThreadAttributeList(attributes,2,0,ref attributeBytes))throw Failure("attribute initialization");attributesInitialized=true;
      jobValues=Marshal.AllocHGlobal(IntPtr.Size);Marshal.WriteIntPtr(jobValues,job);
      // Creation-time assignment removes the suspended-create -> later-assign orphan gap.
      if(!UpdateProcThreadAttribute(attributes,0,new UIntPtr(0x2000D),jobValues,new UIntPtr((uint)IntPtr.Size),IntPtr.Zero,IntPtr.Zero))throw Failure("creation job list");
      standardValues=Marshal.AllocHGlobal(IntPtr.Size*3);Marshal.WriteIntPtr(standardValues,0,input);Marshal.WriteIntPtr(standardValues,IntPtr.Size,output);Marshal.WriteIntPtr(standardValues,IntPtr.Size*2,error);
      if(!UpdateProcThreadAttribute(attributes,0,new UIntPtr(0x20002),standardValues,new UIntPtr((uint)(IntPtr.Size*3)),IntPtr.Zero,IntPtr.Zero))throw Failure("standard handle list");
      var startup=new StartupEx();startup.startup.cb=(uint)Marshal.SizeOf(typeof(StartupEx));startup.startup.flags=0x100;startup.startup.input=input;startup.startup.output=output;startup.startup.error=error;startup.attributes=attributes;
      var command=new StringBuilder(Quote(executable));foreach(string argument in arguments)command.Append(' ').Append(Quote(argument));
      if(!CreateProcessW(executable,command,IntPtr.Zero,IntPtr.Zero,true,0x08080004,IntPtr.Zero,cwd,ref startup,out child))throw Failure("suspended child creation with owned job");
      assigned=true;result.assignedAtCreation=true;
      result.pid=(int)child.pid;
      FileTime created,exited,kernel,user;if(!GetProcessTimes(child.process,out created,out exited,out kernel,out user))throw Failure("child creation time");
      result.createdUtc=DateTime.FromFileTimeUtc(((long)created.high<<32)|created.low).ToString("o");
      bool contained;if(!IsProcessInJob(child.process,job,out contained)||!contained)throw Failure("creation job membership");
      result.assignedBeforeResume=true;
      if(ResumeThread(child.thread)!=1)throw Failure("assigned child resume");
      result.resumed=true;
      while(true) {
        if(!result.aborted && File.Exists(cancelPath)){result.aborted=true;result.abortReason=File.ReadAllText(cancelPath);}
        if(!result.aborted && clock.ElapsedMilliseconds>=timeoutMs){result.aborted=true;result.abortReason="Extraction helper timed out after "+timeoutMs+"ms";}
        uint wait=WaitForSingleObject(child.process,0);if(wait==0xFFFFFFFF)throw Failure("child wait");
        if(wait==0 && !result.processExited){uint code;if(!GetExitCodeProcess(child.process,out code))throw Failure("child exit code");result.exitCode=code;result.processExited=true;}
        Accounting state=ReadJob(job,result);
        if((result.aborted || result.processExited) && state.active>0 && !stopRequested){
          result.normalExitDescendantsStopped=!result.aborted && result.processExited;
          if(!TerminateJobObject(job,1))throw Failure("owned job termination");result.terminateJobCalls++;stopRequested=true;
        }
        if(result.aborted || result.processExited){if(closeStarted<0)closeStarted=clock.ElapsedMilliseconds;}
        if(state.active==0 && result.processExited){result.jobEmpty=true;result.activeAtClosure=0;break;}
        if(closeStarted>=0 && clock.ElapsedMilliseconds-closeStarted>=cleanupMs)throw new Exception("Extraction closure unconfirmed after "+cleanupMs+"ms");
        Thread.Sleep(20);
      }
      if(result.aborted)result.error="Extraction aborted: "+result.abortReason;
      else if(result.exitCode!=0)result.error="Extraction child exited "+result.exitCode;
    } catch(Exception failure) { result.error=failure.Message; }
    finally {
      // Failed initialization/resume keeps the child in the kill-on-close job and on its held handle.
      if(closeStarted<0)closeStarted=clock.ElapsedMilliseconds;
      try {
        if(child.process!=IntPtr.Zero && WaitForSingleObject(child.process,0)!=0){
          if(assigned){if(!TerminateJobObject(job,1))throw Failure("final owned job termination");result.terminateJobCalls++;}
          else {if(!TerminateProcess(child.process,1))throw Failure("unassigned suspended child termination");result.terminateProcessCalls++;}
        }
        if(child.process!=IntPtr.Zero){uint remaining=(uint)Math.Max(0,cleanupMs-(clock.ElapsedMilliseconds-closeStarted));uint wait=WaitForSingleObject(child.process,remaining);if(wait!=0)throw new Exception("Extraction owned child closure unconfirmed");result.processExited=true;uint code;if(!GetExitCodeProcess(child.process,out code))throw Failure("final child exit code");result.exitCode=code;}
        if(job!=IntPtr.Zero){Accounting state=ReadJob(job,result);if(state.active>0){if(!TerminateJobObject(job,1))throw Failure("remaining owned job termination");result.terminateJobCalls++;}while(state.active>0 && clock.ElapsedMilliseconds-closeStarted<cleanupMs){Thread.Sleep(20);state=ReadJob(job,result);}result.activeAtClosure=state.active;result.jobEmpty=state.active==0;if(!result.jobEmpty)throw new Exception("Extraction owned descendants closure unconfirmed");}
      } catch(Exception failure) { result.error=(result.error==null?"":result.error+"; ")+failure.Message; }
      bool closed=true;
      try{if(attributesInitialized)DeleteProcThreadAttributeList(attributes);result.attributeListDisposed=true;}catch(Exception failure){closed=false;result.error=(result.error==null?"":result.error+"; ")+failure.Message;}
      if(attributes!=IntPtr.Zero)Marshal.FreeHGlobal(attributes);if(jobValues!=IntPtr.Zero)Marshal.FreeHGlobal(jobValues);if(standardValues!=IntPtr.Zero)Marshal.FreeHGlobal(standardValues);
      foreach(int item in new int[]{0,1,2,3,4,5}){try{switch(item){case 0:Close(ref child.thread,result);break;case 1:Close(ref child.process,result);break;case 2:Close(ref input,result);break;case 3:Close(ref output,result);break;case 4:Close(ref error,result);break;case 5:Close(ref job,result);break;}}catch(Exception failure){closed=false;result.error=(result.error==null?"":result.error+"; ")+failure.Message;}}
      result.handlesClosed=closed;result.elapsedMs=clock.ElapsedMilliseconds;
    }
    return result;
  }
}
'@
$taskResult=[MapsExtractionJob]::Run([string]$taskSpec.executable,[string[]]$taskSpec.arguments,[string]$taskSpec.cwd,[string]$taskSpec.cancelPath,[int]$taskSpec.timeoutMs,[int]$taskSpec.cleanupMs)
$taskReceipt=[ordered]@{helperPid=$PID;helperScriptSha256=$taskScriptSha256;executable=$taskSpec.executable;arguments=$taskSpec.arguments;cwd=$taskSpec.cwd;createdAt=[DateTimeOffset]::UtcNow.ToString('o');result=$taskResult}
$taskBytes=[Text.UTF8Encoding]::new($false).GetBytes(($taskReceipt | ConvertTo-Json -Depth 6)+[Environment]::NewLine)
$taskStream=[IO.File]::Open([string]$taskSpec.closurePath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{$taskStream.Write($taskBytes,0,$taskBytes.Length)}finally{$taskStream.Dispose()}
if($taskResult.error -or -not $taskResult.jobEmpty -or -not $taskResult.handlesClosed -or $taskResult.aborted -or $taskResult.exitCode -ne 0){exit 1}
exit 0
