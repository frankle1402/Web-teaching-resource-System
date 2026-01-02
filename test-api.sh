#!/bin/bash

echo "======================================"
echo "   教学资源系统 API 测试脚本"
echo "======================================"
echo ""

# API基础URL
BASE_URL="http://localhost:3002"

# 1. 测试登录
echo "[1/7] 测试登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}')

echo "$LOGIN_RESPONSE" | grep -q "success.*true" && echo "✓ 登录成功" || echo "✗ 登录失败"

# 提取Token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ 无法获取Token，测试终止"
  exit 1
fi

echo ""

# 2. 测试获取模板列表
echo "[2/7] 测试获取模板列表..."
TEMPLATES=$(curl -s "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $TOKEN")
echo "$TEMPLATES" | grep -q "success.*true" && echo "✓ 获取模板列表成功" || echo "✗ 失败"
echo ""

# 3. 测试创建文件夹
echo "[3/7] 测试创建文件夹..."
FOLDER=$(curl -s -X POST "$BASE_URL/api/folders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试文件夹"}')
echo "$FOLDER" | grep -q "success.*true" && echo "✓ 创建文件夹成功" || echo "✗ 失败"
FOLDER_ID=$(echo "$FOLDER" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo ""

# 4. 测试获取文件夹树
echo "[4/7] 测试获取文件夹树..."
FOLDER_TREE=$(curl -s "$BASE_URL/api/folders" \
  -H "Authorization: Bearer $TOKEN")
echo "$FOLDER_TREE" | grep -q "success.*true" && echo "✓ 获取文件夹树成功" || echo "✗ 失败"
echo ""

# 5. 测试创建资源
echo "[5/7] 测试创建资源..."
RESOURCE=$(curl -s -X POST "$BASE_URL/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"测试资源",
    "courseName":"解剖学",
    "courseLevel":"高职",
    "major":"护理",
    "subject":"人体解剖学",
    "folderId":'"$FOLDER_ID"',
    "contentHtml":"<h1>测试内容</h1>"
  }')
echo "$RESOURCE" | grep -q "success.*true" && echo "✓ 创建资源成功" || echo "✗ 失败"
RESOURCE_ID=$(echo "$RESOURCE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo ""

# 6. 测试获取资源列表
echo "[6/7] 测试获取资源列表..."
RESOURCES=$(curl -s "$BASE_URL/api/resources?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESOURCES" | grep -q "success.*true" && echo "✓ 获取资源列表成功" || echo "✗ 失败"
echo ""

# 7. 测试发布资源
echo "[7/7] 测试发布资源..."
PUBLISH=$(curl -s -X POST "$BASE_URL/api/resources/$RESOURCE_ID/publish" \
  -H "Authorization: Bearer $TOKEN")
echo "$PUBLISH" | grep -q "success.*true" && echo "✓ 发布资源成功" || echo "✗ 失败"
PUBLIC_URL=$(echo "$PUBLISH" | grep -o '"publicUrl":"[^"]*"' | cut -d'"' -f4)

if [ -n "$PUBLIC_URL" ]; then
  echo "✓ 公开访问URL: $PUBLIC_URL"
fi

echo ""
echo "======================================"
echo "   测试完成！"
echo "======================================"
echo ""
echo "你可以通过以下方式访问系统："
echo "1. 前端地址: http://localhost:5173"
echo "2. 使用手机号登录: 13800138000"
echo "3. 后端API: http://localhost:3002"
echo ""
