@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
cd /d "%~dp0"
title RPAutomation
cls
echo.
echo  ==========================================
echo        RPAutomation ^| Sistema Anne
echo  ==========================================
echo.
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado.
    echo  Acesse https://nodejs.org , instale o LTS e tente novamente.
    start https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%
if not exist "node_modules\" (
    echo.
    echo  [..] Instalando dependencias (primeira vez, aguarde 3-5 min)...
    call npm install
    if errorlevel 1 ( echo  [ERRO] Falha ao instalar. && pause && exit /b 1 )
    echo  [OK] Dependencias instaladas
)
if not exist ".next\" (
    echo.
    echo  [..] Compilando o projeto (primeira vez, aguarde 2-4 min)...
    call npm run build
    if errorlevel 1 ( echo  [ERRO] Falha ao compilar. && pause && exit /b 1 )
    echo  [OK] Compilado
)
echo.
echo  [..] Iniciando servidor...
start /b "" cmd /c "timeout /t 4 >nul 2>&1 && start http://localhost:3000"
echo.
echo  ==========================================
echo    SISTEMA PRONTO! Acesse: http://localhost:3000
echo    Para encerrar: Ctrl+C ou feche esta janela
echo  ==========================================
echo.
call npm start
pause