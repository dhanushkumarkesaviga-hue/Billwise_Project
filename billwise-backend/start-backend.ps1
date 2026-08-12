# BillWise Backend Startup Script
$ErrorActionPreference = "Stop"

$backendDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location -Path $backendDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "BillWise Spring Boot Backend Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check if MongoDB is reachable on 27017
try {
    $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 27017)
    $tcp.Close()
    Write-Host "MongoDB is running on port 27017." -ForegroundColor Green
} catch {
    Write-Warning "MongoDB does not appear to be running on 127.0.0.1:27017. Please start MongoDB if required."
}

# 2. Collect dependency jars from Maven repository
$patterns = @(
    "spring-boot-[0-9]", "spring-boot-starter-[0-9]", "spring-boot-starter-web-[0-9]", "spring-boot-starter-tomcat-[0-9]",
    "spring-boot-starter-json-[0-9]", "spring-boot-starter-logging-[0-9]", "spring-boot-starter-data-mongodb-[0-9]",
    "spring-boot-starter-validation-[0-9]", "spring-boot-starter-security-[0-9]", "spring-boot-autoconfigure-[0-9]",
    "spring-web-6", "spring-webmvc-6", "spring-core-6", "spring-beans-6", "spring-context-6", "spring-aop-6",
    "spring-expression-6", "spring-jcl-6", "spring-tx-6", "spring-data-mongodb-4", "spring-data-commons-3",
    "spring-security-core-6", "spring-security-web-6", "spring-security-config-6", "spring-security-crypto-6",
    "tomcat-embed-core-10", "tomcat-embed-el-10", "tomcat-embed-websocket-10",
    "jackson-databind-2.17", "jackson-core-2.17", "jackson-annotations-2.17", "jackson-datatype-jdk8-2.17", "jackson-datatype-jsr310-2.17", "jackson-module-parameter-names-2.17",
    "logback-classic-1.5", "logback-core-1.5", "slf4j-api-2.0", "jul-to-slf4j-2.0", "log4j-to-slf4j-2.23", "log4j-api-2.23",
    "mongodb-driver-sync-5", "mongodb-driver-core-5", "bson-5", "bson-record-codec-5",
    "hibernate-validator-8.0", "jakarta.validation-api-3.0", "jboss-logging-3.5", "classmate-1.7",
    "jakarta.annotation-api-2.1", "snakeyaml-2.2", "micrometer-observation-1.13", "micrometer-commons-1.13",
    "jjwt-api-0.12.6", "jjwt-impl-0.12.6", "jjwt-jackson-0.12.6", "lombok"
)

$matchedJars = @()
foreach ($pat in $patterns) {
    $found = Get-ChildItem -Path "$env:USERPROFILE\.m2\repository" -Filter "*.jar" -Recurse | Where-Object { $_.Name -match $pat -and $_.Name -notmatch "sources|javadoc" } | Select-Object -First 1
    if ($found) {
        $matchedJars += $found.FullName
    }
}

$cp = ($matchedJars -join ";") + ";$backendDir\target\classes"
Set-Content -Path "$backendDir\run-args.txt" -Value "-cp`n$cp`ncom.billwise.backend.BillwiseBackendApplication"

# 3. Compile check with Lombok & -parameters
$lombokJar = $matchedJars | Where-Object { $_ -match "lombok" } | Select-Object -First 1
if (-not (Test-Path "$backendDir\target\classes\com\billwise\backend\BillwiseBackendApplication.class")) {
    Write-Host "Compiling Java source files with Lombok and -parameters flag..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path "$backendDir\target\classes" | Out-Null
    $javaFiles = (Get-ChildItem -Path "$backendDir\src\main\java" -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName)
    Set-Content -Path "$backendDir\compile-all.txt" -Value "-parameters`n-cp`n$cp`n-processorpath`n$lombokJar`n-d`n$backendDir\target\classes`n$($javaFiles -join "`n")"
    javac "@$backendDir\compile-all.txt"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Compilation failed."
    }
}

Write-Host "Launching BillWise Spring Boot Application on port 8081..." -ForegroundColor Green
java "@$backendDir\run-args.txt"
