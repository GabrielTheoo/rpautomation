@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title RPAutomation - Reconstruindo
cls
echo  Isso vai apagar node_modules e .next e reinstalar tudo.
set /p CONFIRMA="  Continuar? (S/N): "
if /i "%CONFIRMA%" neq "S" ( echo Cancelado. && pause && exit /b 0 )
if exist "node_modules\" ( echo Removendo node_modules... && rd /s /q "node_modules" )
if exist ".next\" ( echo Removendo .next... && rd /s /q ".next" )
echo Pronto. Execute Iniciar.bat novamente.
pause