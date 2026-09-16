# Pure process-inventory classification. This file never starts or stops a process.
# Callers prefer their browser/context/server handles. Any PID fallback must use
# these exact identities again immediately before attempting cleanup.
# These configured Windows executable locations use ordinary DOS absolute paths
# on case-insensitive directories. Fold casing and lexical dot/slash spelling;
# do not accept relative, device, UNC, basename or prefix matches. This does not
# prove file identity and never replaces PID + creation time + retained handle.
function ConvertTo-MapsExecutablePath {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -notmatch '^[A-Za-z]:[\\/]') { return $null }
  try { return [IO.Path]::GetFullPath($Path.Replace('/', '\')) }
  catch { return $null }
}
function Test-MapsExecutablePath {
  param([string]$Expected, [string]$Observed)
  $a = ConvertTo-MapsExecutablePath $Expected
  $b = ConvertTo-MapsExecutablePath $Observed
  return $null -ne $a -and $null -ne $b -and [StringComparer]::OrdinalIgnoreCase.Equals($a, $b)
}
function Test-MapsAllowedExecutable {
  param([string]$Path, [string[]]$AllowedExecutables)
  foreach ($allowed in $AllowedExecutables) { if (Test-MapsExecutablePath $allowed $Path) { return $true } }
  return $false
}
function Test-MapsProcessIdentity {
  param($Expected, $Observed)
  if ($null -eq $Expected -or $null -eq $Observed) { return $false }
  return [long]$Expected.ProcessId -eq [long]$Observed.ProcessId -and
    [DateTimeOffset]$Expected.CreationDate -eq [DateTimeOffset]$Observed.CreationDate -and
    [string]$Expected.Name -ceq [string]$Observed.Name -and
    (Test-MapsExecutablePath ([string]$Expected.ExecutablePath) ([string]$Observed.ExecutablePath))
}

function Get-MapsOwnedProcessSnapshot {
  param(
    [object[]]$Processes,
    [object[]]$KnownIdentities,
    [DateTimeOffset]$StartedAt,
    # Exact executable paths observed/configured for this run, not a name allowlist.
    [string[]]$AllowedExecutables
  )
  $owned = @{}
  $current = @{}
  foreach ($entry in $Processes) { $current[[long]$entry.ProcessId] = $entry }
  foreach ($known in $KnownIdentities) {
    $observed = $current[[long]$known.ProcessId]
    if ((Test-MapsProcessIdentity $known $observed) -and
        (Test-MapsAllowedExecutable ([string]$observed.ExecutablePath) $AllowedExecutables) -and
        [DateTimeOffset]$observed.CreationDate -ge $StartedAt) {
      $owned[[long]$observed.ProcessId] = $observed
    }
  }
  do {
    $added = $false
    foreach ($entry in $Processes) {
      if ($owned.ContainsKey([long]$entry.ProcessId)) { continue }
      # Only a parent alive with the exact admitted identity in THIS snapshot
      # can establish a new child. Historical/exited parent PIDs cannot do so.
      $parent = $owned[[long]$entry.ParentProcessId]
      if ($null -eq $parent -or -not (Test-MapsProcessIdentity $parent $current[[long]$entry.ParentProcessId])) { continue }
      if (-not (Test-MapsAllowedExecutable ([string]$entry.ExecutablePath) $AllowedExecutables)) { continue }
      $created = [DateTimeOffset]$entry.CreationDate
      if ($created -lt $StartedAt -or $created -lt [DateTimeOffset]$parent.CreationDate) { continue }
      $owned[[long]$entry.ProcessId] = $entry
      $added = $true
    }
  } while ($added)
  return @($owned.Values | Sort-Object ProcessId)
}
