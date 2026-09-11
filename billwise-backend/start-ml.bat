@echo off
title BillWise ML Category Classifier Microservice (Port 8000)
cd /d "%~dp0ml"
echo ========================================================
echo   BillWise ML Invoice Category Classifier Microservice
echo ========================================================
echo Starting FastAPI Inference Server on http://localhost:8000 ...

py serve.py
if %ERRORLEVEL% NEQ 0 (
    python serve.py
)
pause
