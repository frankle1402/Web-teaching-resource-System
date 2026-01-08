@echo off
chcp 65001 >nul
title 教学资源生成与管理系统 - 启动器

echo ╔════════════════════════════════════════════════╗
echo ║   教学资源生成与管理系统 - 一键启动           ║
echo ╚════════════════════════════════════════════════╝
echo.

REM 检查Node.js是否安装
echo [1/4] 检查运行环境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    pause
    exit /b 1
)
echo ✓ Node.js 已安装
echo.

REM 检查后端依赖
echo [2/4] 检查后端依赖...
if not exist "backend\node_modules" (
    echo 首次运行，正在安装后端依赖...
    cd backend
    call npm install
    cd ..
    echo ✓ 后端依赖安装完成
) else (
    echo ✓ 后端依赖已存在
)
echo.

REM 检查前端依赖
echo [3/4] 检查前端依赖...
if not exist "frontend\node_modules" (
    echo 首次运行，正在安装前端依赖...
    cd frontend
    call npm install
    cd ..
    echo ✓ 前端依赖安装完成
) else (
    echo ✓ 前端依赖已存在
)
echo.

REM 启动服务
echo [4/4] 启动服务...
echo.
echo ╔════════════════════════════════════════════════╗
echo ║   正在启动后端服务 (端口: 8080)               ║
echo ║   正在启动前端服务 (端口: 5173)               ║
echo ╠════════════════════════════════════════════════╣
echo ║   提示：                                        ║
echo ║   - 前端访问: http://localhost:5173            ║
echo ║   - 后端API:  http://localhost:8080            ║
echo ║   - 按 Ctrl+C 停止服务                         ║
echo ╚════════════════════════════════════════════════╝
echo.

REM 在新窗口启动后端
start "教学资源系统-后端" cmd /k "cd backend && npm run dev"

REM 等待2秒确保后端先启动
timeout /t 2 /nobreak >nul

REM 在新窗口启动前端
start "教学资源系统-前端" cmd /k "cd frontend && npm run dev"

echo.
echo ✓ 服务启动成功！
echo.
echo 系统将在浏览器中自动打开...
echo 如未自动打开，请手动访问: http://localhost:5173
echo.

REM 等待5秒让服务完全启动
timeout /t 5 /nobreak >nul

REM 在默认浏览器中打开
start http://localhost:5173

echo.
echo 提示: 可以关闭此窗口，服务将继续在后台运行
echo      使用 stop.bat 可以停止所有服务
pause
