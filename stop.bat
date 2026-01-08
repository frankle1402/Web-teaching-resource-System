@echo off
chcp 65001 >nul
title 教学资源生成与管理系统 - 停止服务

echo ╔════════════════════════════════════════════════╗
echo ║   教学资源生成与管理系统 - 停止服务           ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 正在查找运行中的服务...
echo.

REM 查找并停止Node.js进程
REM 通过命令行窗口标题来识别
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv /v ^| findstr "教学资源系统"') do (
    echo 发现服务进程: %%i
    taskkill /pid %%~i /f >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ 已停止进程: %%i
    )
)

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   服务已停止                                   ║
echo ╚════════════════════════════════════════════════╝
echo.

timeout /t 2 /nobreak >nul
