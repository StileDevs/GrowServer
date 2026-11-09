# GrowServer local client setup.
#
#   Hosts entries (ELEVATED PowerShell):   powershell -ExecutionPolicy Bypass -File .\update-hosts.ps1 -Hosts
#   Trust login cert (NORMAL PowerShell):  powershell -ExecutionPolicy Bypass -File .\update-hosts.ps1 -Trust
#
# Add -Undo to either to revert that part.
param([switch]$Hosts, [switch]$Trust, [switch]$Undo)

$ErrorActionPreference = "Stop"
if (-not ($Hosts -or $Trust)) { Write-Error "Pass -Hosts (as Administrator) or -Trust (as your normal user)."; exit 1 }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($Hosts) {
    if (-not $isAdmin) { Write-Error "-Hosts must run from an elevated (Administrator) PowerShell."; exit 1 }

    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    $backup    = "$hostsPath.growserver.bak"
    $marker    = "# GrowServer"
    $names     = @("www.growtopia1.com", "www.growtopia2.com", "login.growserver.app")

    $current = [IO.File]::ReadAllText($hostsPath)
    if ($current.Trim().Length -eq 0) {
        Write-Error "hosts is empty. Restore it first: Copy-Item '$backup' '$hostsPath' -Force"
        exit 1
    }
    if (-not (Test-Path $backup)) { Copy-Item $hostsPath $backup }

    $kept = ($current -split "\r?\n") | Where-Object { $_ -notmatch [regex]::Escape($marker) }
    if (-not $Undo) { $kept += $names | ForEach-Object { "127.0.0.1 $_ $marker" } }
    $text = (($kept -join "`r`n").TrimEnd() + "`r`n")

    # Write to a temp file, then copy over hosts: a failed write never truncates hosts.
    $tmp = Join-Path $env:TEMP "hosts.growserver.tmp"
    [IO.File]::WriteAllText($tmp, $text, [Text.Encoding]::ASCII)
    $ok = $false
    for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
        try { Copy-Item $tmp $hostsPath -Force; $ok = $true } catch { Start-Sleep -Milliseconds 500 }
    }
    Remove-Item $tmp -Force
    if (-not $ok) { Write-Error "Could not write hosts (locked by antivirus?). It was left unchanged."; exit 1 }

    ipconfig /flushdns | Out-Null
    if ($Undo) { Write-Host "OK: GrowServer hosts entries removed." } else { Write-Host "OK: GrowServer hosts entries set." }
}

if ($Trust) {
    if ($isAdmin) { Write-Warning "-Trust installs into the CURRENT user's store. Run it from your normal (non-admin) PowerShell." }

    $mkcert = Join-Path $PSScriptRoot "apps\login-page\.cache\bin\mkcert.exe"
    $env:CAROOT = "C:\Users\airin\AppData\Local\mkcert"
    $caFile = Join-Path $env:CAROOT "rootCA.pem"
    if (-not (Test-Path $caFile)) { Write-Error "CA not found at $caFile"; exit 1 }
    $caThumb = (New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $caFile).Thumbprint

    if ($Undo) {
        & $mkcert -uninstall
        Write-Host "OK: mkcert CA removed."
        exit 0
    }

    # Remove mkcert roots that are NOT this CA (left by an earlier run). Windows asks to confirm each.
    Get-ChildItem Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*mkcert development CA*" -and $_.Thumbprint -ne $caThumb } | ForEach-Object {
        Write-Host "Removing stray mkcert CA $($_.Thumbprint)"
        & certutil -user -delstore Root $_.Thumbprint | Out-Null
    }

    & $mkcert -install

    if (Get-ChildItem Cert:\CurrentUser\Root | Where-Object Thumbprint -eq $caThumb) { Write-Host "OK: CA $caThumb is trusted." }
    else { Write-Error "CA $caThumb is not in your Root store (did you decline the Windows prompt?)." }
}
