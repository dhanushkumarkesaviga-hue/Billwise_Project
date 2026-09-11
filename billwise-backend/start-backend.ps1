# BillWise Backend Startup Script
$ErrorActionPreference = "Stop"

$backendDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location -Path $backendDir
$backendDirForward = $backendDir.Replace('\', '/')

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "BillWise Spring Boot Backend Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Load environment variables from .env if present
if (Test-Path "$backendDir\.env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content "$backendDir\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

# 1. Check if MongoDB is reachable on 27017
try {
    $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 27017)
    $tcp.Close()
    Write-Host "MongoDB is running on port 27017." -ForegroundColor Green
} catch {
    Write-Warning "MongoDB does not appear to be running on 127.0.0.1:27017. Please start MongoDB if required."
}

# 2. Collect dependency jars from Maven repository
$cp = ""
$lombokJar = ""
if (Test-Path "$backendDir\run-args.txt") {
    $lines = Get-Content "$backendDir\run-args.txt"
    if ($lines.Length -ge 2 -and $lines[1].Length -gt 100) {
        $cp = $lines[1].Trim('"').Replace('\', '/')
        $lombokJar = ($cp -split ";" | Where-Object { $_ -match "lombok" } | Select-Object -First 1)
    }
}

if (-not $cp -or -not $lombokJar) {
    Write-Host "Resolving dependencies from ~/.m2 repository..." -ForegroundColor Cyan
    $allJars = Get-ChildItem -Path "$env:USERPROFILE\.m2\repository" -Filter "*.jar" -Recurse | Where-Object { $_.Name -notmatch "sources|javadoc" }
    $matchedJars = @()
    foreach ($pat in $patterns) {
        $found = $allJars | Where-Object { $_.Name -match $pat } | Select-Object -First 1
        if ($found) {
            $matchedJars += $found.FullName.Replace('\', '/')
        }
    }
    $cp = ($matchedJars -join ";") + ";$backendDirForward/target/classes"
    $lombokJar = $matchedJars | Where-Object { $_ -match "lombok" } | Select-Object -First 1
    Set-Content -Path "$backendDir\run-args.txt" -Value @("-cp", "`"$cp`"", "com.billwise.backend.BillwiseBackendApplication")
}

# 3. Compile Java source files with Lombok & -parameters
Write-Host "Compiling Java source files with Lombok and -parameters flag..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$backendDir\target\classes" | Out-Null
Copy-Item -Path "$backendDir\src\main\resources\*" -Destination "$backendDir\target\classes" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$backendDir\src\main\resources\application.properties" -Destination "$backendDir\target\classes\application.properties" -Force -ErrorAction SilentlyContinue

$javaFiles = (Get-ChildItem -Path "$backendDir\src\main\java" -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName | ForEach-Object { $_.Replace('\', '/') })
$compileArgs = @("-encoding", "UTF-8", "-parameters", "-cp", "`"$cp`"")
if ($lombokJar) {
    $compileArgs += @("-processorpath", "`"$lombokJar`"")
}
$compileArgs += @("-d", "`"$backendDirForward/target/classes`"")
$compileArgs += ($javaFiles | ForEach-Object { "`"$_`"" })

Set-Content -Path "$backendDir\compile-all.txt" -Value $compileArgs
javac "@$backendDirForward/compile-all.txt"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Compilation failed."
}

Write-Host "Launching BillWise Spring Boot Application on port 8081..." -ForegroundColor Green
java "@$backendDirForward/run-args.txt"
