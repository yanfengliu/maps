param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
$parsed = [Uri]$Uri
if ($parsed.Scheme -ne 'https' -or $parsed.Host -ne 'cyberjapandata.gsi.go.jp' -or -not $parsed.AbsolutePath.StartsWith('/xyz/')) {
    throw 'GSI download must use the official HTTPS xyz tile endpoint.'
}
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../data/source/gsi'))
$target = [IO.Path]::GetFullPath($Destination)
if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'GSI download destination must stay inside this project data/source/gsi directory.'
}
# Invoke-WebRequest uses the same certificate-checked .NET transport verified
# against both a DEM control and the exact aerial tile that HttpClient rejected.
$response = Invoke-WebRequest -Uri $parsed -SslProtocol Tls12 -TimeoutSec 30 -MaximumRetryCount 1 -RetryIntervalSec 1
if ($response.RawContentLength -gt 5000000) { throw 'GSI tile exceeds the five MB acquisition bound.' }
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
$bytes = if ($response.Content -is [string]) { [Text.Encoding]::UTF8.GetBytes($response.Content) } else { $response.Content }
[IO.File]::WriteAllBytes($target, $bytes)
