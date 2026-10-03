@echo off
setlocal DisableDelayedExpansion
set "GIT_RULES_TARGET=%~dp0"
if not "%~1"=="" set "GIT_RULES_TARGET=%~1"
set "GIT_RULES_INSTALLER=%~f0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$text = [IO.File]::ReadAllText($env:GIT_RULES_INSTALLER); $code = ($text -split '(?m)^# POWERSHELL_START\r?\n', 2)[1]; & ([scriptblock]::Create($code))"
set "INSTALL_RESULT=%ERRORLEVEL%"
echo.
if not "%INSTALL_RESULT%"=="0" echo Installation failed. See the error above.
pause
exit /b %INSTALL_RESULT%
# POWERSHELL_START
$ErrorActionPreference = 'Stop'
$workDir = $null
$exitCode = 1
try {
    foreach ($command in @('node', 'npm', 'git')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is required. Install Git and Node.js with npm, then try again."
        }
    }
    if (-not (Test-Path -LiteralPath $env:GIT_RULES_TARGET -PathType Container)) {
        throw 'The target project folder does not exist.'
    }
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $workDir = Join-Path $tempRoot ('git-rules-download-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $workDir | Out-Null
    $archive = Join-Path $workDir 'source.zip'
    Write-Host 'Downloading gitRules from GitHub...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/lemonAlpha23/gitRules/archive/HEAD.zip' -OutFile $archive -TimeoutSec 120
    Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $workDir 'source')
    $folders = @(Get-ChildItem -LiteralPath (Join-Path $workDir 'source') -Directory)
    if ($folders.Count -ne 1) { throw 'Unexpected repository archive layout.' }
    $source = $folders[0].FullName
    foreach ($file in @('install.cjs', 'package.json', 'commitlint.config.js')) {
        if (-not (Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) {
            throw "Missing $file in GitHub repository. Publish the installer files before using this BAT."
        }
    }
    Write-Host "Installing into: $env:GIT_RULES_TARGET"
    & node (Join-Path $source 'install.cjs')
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        $ignoreFile = Join-Path $env:GIT_RULES_TARGET '.gitignore'
        $ignore = if (Test-Path -LiteralPath $ignoreFile) { [IO.File]::ReadAllText($ignoreFile) } else { '' }
        if (($ignore -split '\r?\n') -notcontains '/install.bat') {
            if ($ignore.Length -gt 0 -and -not $ignore.EndsWith("`n")) { $ignore += "`n" }
            $ignore += "/install.bat`n"
            [IO.File]::WriteAllText($ignoreFile, $ignore, (New-Object System.Text.UTF8Encoding($false)))
            Write-Host 'Added /install.bat to .gitignore'
        }
    }
} catch {
    Write-Host "Installation failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($workDir -and (Test-Path -LiteralPath $workDir)) {
        $resolved = [IO.Path]::GetFullPath($workDir)
        $expectedParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
        if ((Split-Path $resolved -Parent) -eq $expectedParent -and (Split-Path $resolved -Leaf) -match '^git-rules-download-[a-f0-9]{32}$') {
            Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
exit $exitCode
