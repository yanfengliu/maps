param([int]$TimeoutSeconds = 120, [string]$HeaderDirectory = '')
$ErrorActionPreference = 'Stop'
if ($TimeoutSeconds -lt 1 -or $TimeoutSeconds -gt 120) { throw 'Core compilation timeout must be within1-120 seconds.' }

function Guard-Path([string]$Path, [string]$Kind = 'File', [switch]$AllowMissing) {
    $full = [IO.Path]::GetFullPath($Path)
    $drive = [IO.Path]::GetPathRoot($full)
    if ($drive -notmatch '^[A-Za-z]:\\$') { throw "Core proof needs a real absolute Windows drive path: $Path" }
    $parts = $full.Substring($drive.Length).Split('\')
    $current = $drive
    $all = @($drive)
    foreach ($part in $parts) {
        if ($part -eq '' -or $part -in '.', '..' -or $part -match '[\x00-\x1f<>:"|?*%&]' -or $part.EndsWith('.') -or $part.EndsWith(' ') -or $part -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)') { throw "Core proof has an unsafe Windows path component: $Path" }
        $current = [IO.Path]::Combine($current, $part); $all += $current
    }
    for ($i = 0; $i -lt $all.Count; $i++) {
        $component = $all[$i]
        try { $attributes = [IO.File]::GetAttributes($component) }
        catch {
            $reason = $_.Exception.InnerException
            if ($AllowMissing -and $null -ne $reason -and (($reason.HResult -band 0xffff) -in 2,3)) { continue }
            throw "Core proof cannot inspect required path $component : $($_.Exception.Message)"
        }
        if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Core proof rejects reparse path: $component" }
        $directory = ($attributes -band [IO.FileAttributes]::Directory) -ne 0
        if (($i -lt $all.Count-1 -or $Kind -eq 'Directory') -and -not $directory) { throw "Core proof parent is not a directory: $component" }
        if ($i -eq $all.Count-1 -and $Kind -eq 'File' -and $directory) { throw "Core proof expected a regular file: $component" }
    }
    return $full
}
function Confined-Path([string]$Root, [string]$Path, [string]$Kind = 'File', [switch]$AllowMissing) {
    $rootFull = (Guard-Path $Root 'Directory').TrimEnd('\')
    $full = [IO.Path]::GetFullPath($Path)
    if (-not $full.StartsWith($rootFull+'\', [StringComparison]::OrdinalIgnoreCase)) { throw "Core proof path must stay inside $rootFull : $Path" }
    return Guard-Path $full $Kind -AllowMissing:$AllowMissing
}
function File-Record([string]$Path, [int64]$Maximum = 5242880) {
    $full = Guard-Path $Path
    $before = [IO.FileInfo]::new($full)
    $size = $before.Length; $ticks = $before.LastWriteTimeUtc.Ticks
    if ($size -lt 1 -or $size -gt $Maximum) { throw "Core proof file size is outside1-$Maximum bytes: $full" }
    $stream = $null; $sha = $null
    try {
        $stream = [IO.File]::Open($full, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
        if ($stream.Length -ne $size) { throw "Core proof input changed before hashing: $full" }
        $sha = [Security.Cryptography.SHA256]::Create()
        $hash = [Convert]::ToHexString($sha.ComputeHash($stream)).ToLower()
        if ($stream.Position -ne $size -or $stream.Length -ne $size) { throw "Core proof input changed during hashing: $full" }
    } finally { if ($stream) { $stream.Dispose() }; if ($sha) { $sha.Dispose() } }
    $null = Guard-Path $full
    $after = [IO.FileInfo]::new($full)
    if ($after.Length -ne $size -or $after.LastWriteTimeUtc.Ticks -ne $ticks) { throw "Core proof input changed while hashing: $full" }
    return @{ bytes=$size; sha256=$hash }
}
function Fixture-Inventory([string]$Directory, [switch]$AllowEmpty) {
    $directory = Guard-Path $Directory 'Directory'
    $inventory = @{}
    foreach ($entry in Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop) {
        $path = Confined-Path $directory $entry.FullName
        $inventory[$entry.Name] = File-Record $path 1048576
    }
    if ((-not $AllowEmpty -and $inventory.Count -lt 1) -or $inventory.Count -gt 100) { throw "Core proof fixture inventory needs1-100 regular files: $directory" }
    return $inventory
}
function Compare-Inventory($Before, $After, [string]$Label) {
    foreach ($name in $Before.Keys) {
        if (-not $After.ContainsKey($name)) { throw "Core proof $Label input disappeared: $name" }
        if ($Before[$name].bytes -ne $After[$name].bytes -or $Before[$name].sha256 -ne $After[$name].sha256) { throw "Core proof $Label input changed size or hash: $name" }
    }
    foreach ($name in $After.Keys) { if (-not $Before.ContainsKey($name)) { throw "Core proof $Label input was added: $name" } }
}

$null = Guard-Path $PSScriptRoot 'Directory'
$repo = Guard-Path ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))) 'Directory'
$owned = Guard-Path (Join-Path $repo 'Artifacts') 'Directory'
$baseInclude = Confined-Path $repo (Join-Path $repo 'Source/ShibuyaRuntime/Public') 'Directory'
$include = $baseInclude
if ($HeaderDirectory) { $include = Confined-Path $owned $HeaderDirectory 'Directory' }
$source = Confined-Path $repo (Join-Path $repo 'tests/runtime/test_simulation.cpp')
$fixtureDirectory = Confined-Path $repo (Join-Path $repo 'tests/runtime/fixtures') 'Directory'
$fixtures = Fixture-Inventory $fixtureDirectory
$inputs = @{ 'test_simulation.cpp'=$source }
foreach ($name in 'test_vehicle_body_pose.cpp','test_vehicle_body_support.cpp') { $inputs[$name] = Confined-Path $repo (Join-Path $repo ('tests/runtime/'+$name)) }
foreach ($name in 'CitySimulation.h','RuntimePath.h','RuntimeReadLimit.h','VehicleBodyPose.h','VehicleBodySupport.h','NativeFrame.h') {
    $candidate = Confined-Path $repo (Join-Path $include $name) 'File' -AllowMissing
    try { $null = [IO.File]::GetAttributes($candidate) }
    catch {
        $reason = $_.Exception.InnerException
        if ($null -eq $reason -or (($reason.HResult -band 0xffff) -notin 2,3)) { throw }
        $candidate = Confined-Path $repo (Join-Path $baseInclude $name)
    }
    $inputs[$name] = $candidate
}
$inputRecords = @{}
foreach ($name in $inputs.Keys) { $inputRecords[$name] = File-Record $inputs[$name] }
$dev = Guard-Path 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat'
$null = File-Record $dev
$output = Confined-Path $owned (Join-Path $owned ('runtime-core/'+[Guid]::NewGuid().ToString('N'))) 'Directory' -AllowMissing
[IO.Directory]::CreateDirectory($output) | Out-Null
$output = Confined-Path $owned $output 'Directory'
$snapshot = Confined-Path $output (Join-Path $output 'inputs') 'Directory' -AllowMissing
[IO.Directory]::CreateDirectory($snapshot) | Out-Null
$snapshotFixtures = Confined-Path $output (Join-Path $snapshot 'fixtures') 'Directory' -AllowMissing
[IO.Directory]::CreateDirectory($snapshotFixtures) | Out-Null
foreach ($name in $inputs.Keys) {
    $from = Guard-Path $inputs[$name]; $to = Confined-Path $output (Join-Path $snapshot $name) 'File' -AllowMissing
    [IO.File]::Copy($from,$to,$false)
    $copy = File-Record $to
    Compare-Inventory @{ $name=$inputRecords[$name] } @{ $name=$copy } 'snapshot'
}
foreach ($name in $fixtures.Keys) {
    $from = Confined-Path $fixtureDirectory (Join-Path $fixtureDirectory $name)
    $to = Confined-Path $output (Join-Path $snapshotFixtures $name) 'File' -AllowMissing
    [IO.File]::Copy($from,$to,$false)
    Compare-Inventory @{ $name=$fixtures[$name] } @{ $name=(File-Record $to 1048576) } 'fixture snapshot'
}
$batch = Confined-Path $output (Join-Path $output 'run.cmd') 'File' -AllowMissing
$exe = Confined-Path $output (Join-Path $output 'simulation-tests.exe') 'File' -AllowMissing
$obj = Confined-Path $output (Join-Path $output 'simulation-tests.obj') 'File' -AllowMissing
$programs = @{
    'simulation-tests'='test_simulation.cpp'
    'vehicle-body-pose-tests'='test_vehicle_body_pose.cpp'
    'vehicle-body-support-tests'='test_vehicle_body_support.cpp'
}
$lines = @('@echo off', ('call "'+$dev+'" -arch=amd64 -host_arch=amd64'), 'if errorlevel 1 exit /b 1')
foreach ($program in @('simulation-tests','vehicle-body-pose-tests','vehicle-body-support-tests')) {
    $programExe = Confined-Path $output (Join-Path $output ($program+'.exe')) 'File' -AllowMissing
    $programObj = Confined-Path $output (Join-Path $output ($program+'.obj')) 'File' -AllowMissing
    $lines += ('cl /nologo /std:c++20 /EHsc /W4 /O2 /I"'+$snapshot+'" /Fe"'+$programExe+'" /Fo"'+$programObj+'" "'+(Join-Path $snapshot $programs[$program])+'"')
    $lines += 'if errorlevel 1 exit /b 1'
    $lines += ('"'+$programExe+'"')
    $lines += 'if errorlevel 1 exit /b 1'
}
$lines += 'exit /b 0'
[IO.File]::WriteAllLines((Confined-Path $output $batch 'File' -AllowMissing), $lines, [Text.Encoding]::ASCII)
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = Guard-Path $env:ComSpec
$start.Arguments = '/d /s /c ""'+$batch+'""'; $start.WorkingDirectory = Guard-Path $output 'Directory'
$start.UseShellExecute=$false; $start.CreateNoWindow=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
$process = [Diagnostics.Process]::new(); $process.StartInfo=$start; $started=$false
try {
    Compare-Inventory $fixtures (Fixture-Inventory $fixtureDirectory -AllowEmpty) 'fixture'
    foreach ($name in $inputs.Keys) { Compare-Inventory @{ $name=$inputRecords[$name] } @{ $name=(File-Record $inputs[$name]) } 'compile' }
    $null = Guard-Path $dev; $null = Guard-Path $batch; $null = Guard-Path $snapshot 'Directory'; $null = Guard-Path $output 'Directory'
    foreach ($name in $inputs.Keys) { $null = Guard-Path (Join-Path $snapshot $name) }
    $null = Fixture-Inventory $snapshotFixtures
    Write-Output ('CORE_PROOF_INPUTS_ADMITTED '+$output)
    $started=$process.Start(); $stdout=$process.StandardOutput.ReadToEndAsync(); $stderr=$process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit($TimeoutSeconds*1000)) { throw "Core tests exceeded $TimeoutSeconds seconds; owned compiler tree will close." }
    $text=$stdout.GetAwaiter().GetResult(); $errors=$stderr.GetAwaiter().GetResult()
    [IO.File]::WriteAllText((Confined-Path $output (Join-Path $output 'stdout.log') 'File' -AllowMissing),$text)
    [IO.File]::WriteAllText((Confined-Path $output (Join-Path $output 'stderr.log') 'File' -AllowMissing),$errors)
    Compare-Inventory $fixtures (Fixture-Inventory $fixtureDirectory -AllowEmpty) 'fixture'
    Compare-Inventory $fixtures (Fixture-Inventory $snapshotFixtures -AllowEmpty) 'fixture snapshot'
    foreach ($name in $inputs.Keys) {
        Compare-Inventory @{ $name=$inputRecords[$name] } @{ $name=(File-Record $inputs[$name]) } 'compile'
        Compare-Inventory @{ $name=$inputRecords[$name] } @{ $name=(File-Record (Confined-Path $output (Join-Path $snapshot $name))) } 'snapshot'
    }
    $passed=$process.ExitCode -eq 0 -and $text -match 'PASS: [0-9]+ actual-core assertions' -and $text -match 'PASS: [0-9]+ finite-body core assertions' -and $text -match 'PASS [0-9]+ support/coverage assertions'
    $programHashes=@{}; foreach ($program in $programs.Keys) { $programHashes[$program]=(File-Record (Confined-Path $output (Join-Path $output ($program+'.exe'))) 134217728) }
    $fixtureHashes=@{}; foreach ($name in $fixtures.Keys) { $fixtureHashes[$name]=$fixtures[$name].sha256 }
    $receipt=@{ passed=$passed; exit_code=$process.ExitCode; owned_pid=$process.Id; fixture_sha256=$fixtureHashes; fixture_inventory=$fixtures; input_inventory=$inputRecords; executables=$programHashes; core_sha256=$inputRecords['CitySimulation.h'].sha256; test_sha256=$inputRecords['test_simulation.cpp'].sha256; executable_sha256=(File-Record (Confined-Path $output $exe) 134217728).sha256; bound='Actual compiled simulation and finite-body support cores, numerical retained-road/contact and source fixtures; exact input membership/size/hash and reparse-checked paths before/after. Synthetic cost is diagnostic. No actual UE placement, native game rendering, collision, input or full-population performance claim.' }
    [IO.File]::WriteAllText((Confined-Path $output (Join-Path $output 'report.json') 'File' -AllowMissing),($receipt | ConvertTo-Json -Depth 8))
    Write-Output $text; if ($errors) { Write-Output $errors }; Write-Output ('Receipt: '+$output+'/report.json')
    if (-not $passed) { throw "Actual core failed: $output/report.json" }
} finally {
    # Process cleanup owns only this process tree; it does not follow an output
    # pathname. All retained files remain evidence and are never recursively removed.
    if ($started -and -not $process.HasExited) { $process.Kill($true); if (-not $process.WaitForExit(30000)) { throw 'Owned core process did not stop after cleanup.' } }
    $process.Dispose()
}
