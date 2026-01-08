@echo off
chcp 65001 >nul 2>&1
title Teaching Resource System - Stop Services

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          教学资源生成与管理系统 - 停止服务                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] 停止所有 Node.js 进程...

:: 方法1: 通过进程名停止
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    taskkill /F /IM node.exe >nul 2>&1
    echo      已停止 Node.js 进程
) else (
    echo      未发现运行中的 Node.js 进程
)

echo.
echo [2/3] 释放端口 8080 和 5173...

:: 检查并释放8080端口
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo      已释放端口 8080
)

:: 检查并释放5173端口
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo      已释放端口 5173
)

echo.
echo [3/3] 验证端口状态...

:: 验证8080端口
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo      警告: 端口 8080 仍被占用
) else (
    echo      端口 8080 已释放
)

:: 验证5173端口
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo      警告: 端口 5173 仍被占用
) else (
    echo      端口 5173 已释放
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    服务已停止                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
