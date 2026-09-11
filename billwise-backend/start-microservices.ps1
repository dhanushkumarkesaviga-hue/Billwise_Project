# ========================================================
# BillWise Microservices Orchestrator & Launcher (PowerShell)
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  BILLWISE SAAS GST COMPLIANCE - MICROSERVICES LAUNCHER  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Clean stop old java processes
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Verify Dual-Database Infrastructure (MySQL + MongoDB)
$mysqlPort = 3306
$mysqlActive = Test-NetConnection -ComputerName 127.0.0.1 -Port $mysqlPort -WarningAction SilentlyContinue -InformationLevel Quiet
if (-not $mysqlActive) {
    Write-Host "[!] Warning: MySQL not detected on port 3306. Ensure MySQL server is running." -ForegroundColor Yellow
} else {
    Write-Host "[OK] MySQL active on port 3306 (powers Auth & Merchant Service)" -ForegroundColor Green
}

$mongoPort = 27017
$mongoActive = Test-NetConnection -ComputerName 127.0.0.1 -Port $mongoPort -WarningAction SilentlyContinue -InformationLevel Quiet
if (-not $mongoActive) {
    Write-Host "[!] MongoDB not responding on port 27017. Attempting to start MongoDB service..." -ForegroundColor Yellow
    Start-Process -FilePath "mongod" -ArgumentList "--dbpath=`"$env:USERPROFILE\data\db`"" -WindowStyle Hidden -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
Write-Host "[OK] MongoDB active on port 27017 (powers Invoice & OCR Extractions)" -ForegroundColor Green

# 3. Resolve Artifact JARs
$eurekaJar = (Get-ChildItem -Path "$ScriptDir\eureka-server\target" -Filter "eureka-server-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
$gatewayJar = (Get-ChildItem -Path "$ScriptDir\api-gateway\target" -Filter "api-gateway-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
$authJar = (Get-ChildItem -Path "$ScriptDir\auth-service\target" -Filter "auth-service-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
$invoiceJar = (Get-ChildItem -Path "$ScriptDir\invoice-service\target" -Filter "invoice-service-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName

if (-not $eurekaJar -or -not $gatewayJar -or -not $authJar -or -not $invoiceJar) {
    Write-Host "`n[*] Packaging all microservices via Maven..." -ForegroundColor Yellow
    & "$ScriptDir\mvnw.cmd" clean package -DskipTests
    $eurekaJar = (Get-ChildItem -Path "$ScriptDir\eureka-server\target" -Filter "eureka-server-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
    $gatewayJar = (Get-ChildItem -Path "$ScriptDir\api-gateway\target" -Filter "api-gateway-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
    $authJar = (Get-ChildItem -Path "$ScriptDir\auth-service\target" -Filter "auth-service-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
    $invoiceJar = (Get-ChildItem -Path "$ScriptDir\invoice-service\target" -Filter "invoice-service-*.jar" | Where-Object { $_.Name -notmatch "original" } | Select-Object -First 1).FullName
}

# 4. Start ML Invoice Classifier Microservice (Port 8000)
$mlPort = 8000
$mlActive = Test-NetConnection -ComputerName 127.0.0.1 -Port $mlPort -WarningAction SilentlyContinue -InformationLevel Quiet
if (-not $mlActive) {
    Write-Host "`n[1/5] Starting Custom ML Category Classifier (Port 8000)..." -ForegroundColor Cyan
    $pythonCmd = if (Get-Command "py" -ErrorAction SilentlyContinue) { "py" } else { "python" }
    Start-Process -FilePath $pythonCmd -ArgumentList "serve.py" -WorkingDirectory "$ScriptDir\ml" -WindowStyle Minimized -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
} else {
    Write-Host "[OK] ML Classifier Microservice already active on port 8000" -ForegroundColor Green
}

# 5. Start Eureka Server (Port 8761)
Write-Host "`n[2/5] Starting Eureka Discovery Server (Port 8761)..." -ForegroundColor Cyan
$pEureka = Start-Process -FilePath "java" -ArgumentList "-Djava.net.preferIPv4Stack=true", "-jar", "`"$eurekaJar`"" -PassThru -NoNewWindow
Start-Sleep -Seconds 8

# 6. Start Auth & Merchant Service (Port 8082)
Write-Host "[3/5] Starting Auth & Merchant Service (Port 8082)..." -ForegroundColor Cyan
$pAuth = Start-Process -FilePath "java" -ArgumentList "-Djava.net.preferIPv4Stack=true", "-jar", "`"$authJar`"" -PassThru -NoNewWindow
Start-Sleep -Seconds 6

# 7. Start Invoice & Compliance Service (Port 8083)
Write-Host "[4/5] Starting Invoice & Compliance Service (Port 8083)..." -ForegroundColor Cyan
$pInvoice = Start-Process -FilePath "java" -ArgumentList "-Djava.net.preferIPv4Stack=true", "-jar", "`"$invoiceJar`"" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

# 8. Start API Gateway (Port 8081)
Write-Host "[5/5] Starting Spring Cloud API Gateway (Port 8081)..." -ForegroundColor Cyan
$pGateway = Start-Process -FilePath "java" -ArgumentList "-Djava.net.preferIPv4Stack=true", "-jar", "`"$gatewayJar`"" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  ALL BILLWISE MICROSERVICES RUNNING SUCCESSFULLY!       " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Eureka Registry : http://localhost:8761" -ForegroundColor Yellow
Write-Host "  API Gateway     : http://localhost:8081" -ForegroundColor Yellow
Write-Host "  Auth Service    : http://localhost:8082" -ForegroundColor Yellow
Write-Host "  Invoice Service : http://localhost:8083" -ForegroundColor Yellow
Write-Host "  ML Classifier   : http://localhost:8000" -ForegroundColor Yellow
Write-Host "  React Frontend  : http://localhost:3000" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Microservices running in background.`n"

while ($true) {
    Start-Sleep -Seconds 60
}

