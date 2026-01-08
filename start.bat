@echo off
chcp 65001 >nul 2>&1
title Teaching Resource System - Startup

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          教学资源生成与管理系统 - 启动脚本                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: 设置项目路径
set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"

:: ==========================================
:: 步骤1: 检查并清理占用的端口
:: ==========================================
echo [1/4] 检查端口占用情况...

:: 检查8080端口
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING" 2^>nul') do (
    echo      发现端口8080被占用，正在清理...
    taskkill /F /PID %%a >nul 2>&1
)

:: 检查5173端口
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING" 2^>nul') do (
    echo      发现端口5173被占用，正在清理...
    taskkill /F /PID %%a >nul 2>&1
)

echo      端口检查完成
echo.

:: ==========================================
:: 步骤2: 检查依赖
:: ==========================================
echo [2/4] 检查项目依赖...

:: 检查后端依赖
if not exist "%BACKEND_DIR%\node_modules" (
    echo      正在安装后端依赖...
    cd /d "%BACKEND_DIR%"
    npm install
    if errorlevel 1 (
        echo      错误: 后端依赖安装失败
        pause
        exit /b 1
    )
)

:: 检查前端依赖
if not exist "%FRONTEND_DIR%\node_modules" (
    echo      正在安装前端依赖...
    cd /d "%FRONTEND_DIR%"
    npm install
    if errorlevel 1 (
        echo      错误: 前端依赖安装失败
        pause
        exit /b 1
    )
)

echo      依赖检查完成
echo.

:: ==========================================
:: 步骤3: 启动后端服务
:: ==========================================
echo [3/4] 启动后端服务 (端口: 8080)...
start "Backend - Port 8080" cmd /k "cd /d %BACKEND_DIR% && npm run dev"
timeout /t 3 /nobreak >nul
echo      后端服务已启动
echo.

:: ==========================================
:: 步骤4: 启动前端服务
:: ==========================================
echo [4/4] 启动前端服务 (端口: 5173)...
start "Frontend - Port 5173" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"
timeout /t 3 /nobreak >nul
echo      前端服务已启动
echo.

:: ==========================================
:: 完成
:: ==========================================
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    服务启动完成                            ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  后端服务: http://localhost:8080                           ║
echo ║  前端服务: http://localhost:5173                           ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  停止服务: 运行 stop.bat                                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: 等待服务完全启动
echo 等待服务初始化...
timeout /t 5 /nobreak >nul

:: 打开浏览器
echo 正在打开浏览器...
start http://localhost:5173

echo.
echo 按任意键关闭此窗口（服务将继续运行）...
pause >nul
