<#
.SYNOPSIS
    Deploys the StockSim Vue/Vite app to IIS.

.DESCRIPTION
    Builds the Vite project, copies output to $env:ProgramFiles\StockSim,
    ensures C:\Logs\StockSim exists, and sets IIS-friendly ACLs.

.PARAMETER SkipBuild
    Skip the npm build step (useful if you already ran `npm run build`).

.PARAMETER AppPoolName
    IIS Application Pool name tied to StockSim. Default: 'StockSimAppPool'.

.PARAMETER SiteName
    IIS Site name. Default: 'Default Web Site'.

.PARAMETER AppName
    IIS Application alias under the site. Default: 'StockSim'.

.EXAMPLE
    .\deploy.ps1
    Full build + deploy.

.EXAMPLE
    .\deploy.ps1 -SkipBuild
    Deploy without rebuilding.
#>

[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [string]$AppPoolName = 'StockSimAppPool',
    [string]$SiteName = 'Default Web Site',
    [string]$AppName = 'StockSim'
)

$ErrorActionPreference = 'Stop'
$script:DeployStart = Get-Date

$TargetDir  = Join-Path $env:ProgramFiles 'StockSim'
$LogDir     = 'C:\Logs\StockSim'
$DistDir    = Join-Path $PSScriptRoot 'dist'

# ──────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────
function Write-Step {
    param([string]$Message)
    Write-Host ">>> $Message" -ForegroundColor Cyan
}

function Write-OK {
    param([string]$Message)
    Write-Host "    OK  $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "    WARN $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "    ERR $Message" -ForegroundColor Red
}

# ──────────────────────────────────────────────
# 1. Build
# ──────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step 'Building project (npm run build) ...'
    Push-Location $PSScriptRoot
    try {
        npm ci 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn 'npm ci failed -- falling back to npm install'
            npm install
        }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
        Write-OK 'Build completed'
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Step 'Skipping build (-SkipBuild)'
}

if (-not (Test-Path $DistDir)) {
    throw "dist/ folder not found at $DistDir. Run the build first."
}

# ──────────────────────────────────────────────
# 2. Ensure target directories
# ──────────────────────────────────────────────
Write-Step 'Ensuring target directories ...'
foreach ($dir in @($TargetDir, $LogDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-OK "Created $dir"
    }
    else {
        Write-OK "$dir already exists"
    }
}

# ──────────────────────────────────────────────
# 3. (Optional) stop IIS app pool
# ──────────────────────────────────────────────
Import-Module WebAdministration -ErrorAction SilentlyContinue

if (Get-Module WebAdministration) {
    Write-Step "Recycling app pool '$AppPoolName' ..."
    $pool = Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    if ($pool) {
        Stop-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
        Write-OK "Stopped $AppPoolName"
    }
    else {
        Write-Warn "App pool '$AppPoolName' not found -- create it in IIS first."
    }
}
else {
    Write-Warn 'WebAdministration module unavailable (run on a machine with IIS mgmt tools).'
}

# ──────────────────────────────────────────────
# 4. Copy files
# ──────────────────────────────────────────────
Write-Step "Deploying files to $TargetDir ..."
try {
    # Remove old content but keep the directory
    Get-ChildItem -Path $TargetDir -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Copy-Item -Path "$DistDir\*" -Destination $TargetDir -Recurse -Force
    Write-OK 'Files copied'
}
catch {
    Write-Err "Copy failed: $_"
    throw
}

# ──────────────────────────────────────────────
# 5. Set permissions (IIS_IUSRS read)
# ──────────────────────────────────────────────
Write-Step 'Setting NTFS permissions ...'
$acl = Get-Acl $TargetDir
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    'IIS_IUSRS',
    'ReadAndExecute',
    'ContainerInherit,ObjectInherit',
    'None',
    'Allow'
)
$acl.AddAccessRule($rule)
Set-Acl -Path $TargetDir -AclObject $acl
Write-OK "Granted ReadAndExecute to IIS_IUSRS on $TargetDir"

# Also ensure logs dir is writable by the app pool identity (or IIS_IUSRS)
$logAcl = Get-Acl $LogDir
$logRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    'IIS_IUSRS',
    'Modify',
    'ContainerInherit,ObjectInherit',
    'None',
    'Allow'
)
$logAcl.AddAccessRule($logRule)
Set-Acl -Path $LogDir -AclObject $logAcl
Write-OK "Granted Modify to IIS_IUSRS on $LogDir"

# ──────────────────────────────────────────────
# 6. Restart IIS app pool
# ──────────────────────────────────────────────
if (Get-Module WebAdministration) {
    Write-Step "Starting app pool '$AppPoolName' ..."
    $pool = Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    if ($pool) {
        Start-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
        Write-OK "Started $AppPoolName"
    }
}
else {
    Write-Warn 'Skipped IIS restart -- WebAdministration module not loaded.'
}

# ──────────────────────────────────────────────
# 7. Summary
# ──────────────────────────────────────────────
$elapsed = [math]::Round(((Get-Date) - $script:DeployStart).TotalSeconds, 1)
Write-Host ''
Write-Host '=== Deploy complete ===' -ForegroundColor Green
Write-Host "   Target   : $TargetDir"
Write-Host "   Logs     : $LogDir"
Write-Host "   Duration : ${elapsed}s"
Write-Host ''
Write-Host 'Next steps in IIS Manager:'
Write-Host "  1. Under '$SiteName', add an Application:"
Write-Host "     Alias  : $AppName"
Write-Host "     Pool   : $AppPoolName"
Write-Host "     Path   : $TargetDir"
Write-Host '  2. Set the app pool .NET CLR version to No Managed Code.'
Write-Host '  3. A web.config for SPA fallback is already included in dist/.'
Write-Host ''
