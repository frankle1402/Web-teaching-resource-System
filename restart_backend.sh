#!/bin/bash

echo "=== 后端服务器重启脚本 ==="

# 1. 清理3002端口上的所有进程
echo "1. 清理端口3002..."
for i in {1..5}; do
  pids=$(netstat -ano | findstr :3002 | awk '{print $5}' | sort -u)
  if [ -n "$pids" ]; then
    echo $pids | xargs -I {} taskkill //F //PID {} 2>/dev/null
    sleep 1
  fi
done

# 2. 确认端口已释放
sleep 2
if netstat -ano | findstr :3002 > /dev/null; then
  echo "✗ 端口仍被占用，请手动检查"
  exit 1
else
  echo "✓ 端口已清理"
fi

# 3. 删除旧数据库
echo "2. 删除旧数据库..."
cd backend
if [ -f database/teaching_resources.sqlite ]; then
  rm -f database/teaching_resources.sqlite
  echo "✓ 数据库文件已删除"
else
  echo "  (数据库文件不存在)"
fi

# 4. 启动服务器
echo "3. 启动后端服务器..."
npm run dev
