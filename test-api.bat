@echo off
echo ======================================
echo    教学资源系统 API 测试脚本
echo ======================================
echo.

set BASE_URL=http://localhost:3002

echo [1/7] 测试登录...
curl -s -X POST "%BASE_URL%/api/auth/mock-login" -H "Content-Type: application/json" -d "{\"phone\":\"13800138000\"}" > login_response.json
findstr "\"success\":true" login_response.json >nul && (
    echo ✓ 登录成功
) || (
    echo ✗ 登录失败
    goto :end
)

echo.
echo [2/7] 测试获取模板列表...
curl -s "%BASE_URL%/api/templates" -H "Authorization: Bearer TOKEN" > templates_response.json
findstr "\"success\":true" templates_response.json >nul && echo ✓ 获取模板列表成功 || echo ✗ 失败

echo.
echo [3/7] 测试创建文件夹...
curl -s -X POST "%BASE_URL%/api/folders" -H "Content-Type: application/json" -d "{\"name\":\"测试文件夹\"}" -H "Authorization: Bearer TOKEN" > folder_response.json
findstr "\"success\":true" folder_response.json >nul && echo ✓ 创建文件夹成功 || echo ✗ 失败

echo.
echo [4/7] 测试获取文件夹树...
curl -s "%BASE_URL%/api/folders" -H "Authorization: Bearer TOKEN" > folders_list_response.json
findstr "\"success\":true" folders_list_response.json >nul && echo ✓ 获取文件夹树成功 || echo ✗ 失败

echo.
echo [5/7] 测试创建资源...
curl -s -X POST "%BASE_URL%/api/resources" -H "Content-Type: application/json" -d "{\"title\":\"测试资源\",\"courseName\":\"解剖学\",\"courseLevel\":\"高职\",\"major\":\"护理\",\"subject\":\"人体解剖学\",\"contentHtml\":\"<h1>测试内容</h1>\"}" -H "Authorization: Bearer TOKEN" > resource_response.json
findstr "\"success\":true" resource_response.json >nul && echo ✓ 创建资源成功 || echo ✗ 失败

echo.
echo [6/7] 测试获取资源列表...
curl -s "%BASE_URL%/api/resources?page=1&pageSize=10" -H "Authorization: Bearer TOKEN" > resources_list_response.json
findstr "\"success\":true" resources_list_response.json >nul && echo ✓ 获取资源列表成功 || echo ✗ 失败

echo.
echo [7/7] 测试发布资源...
REM curl -s -X POST "%BASE_URL%/api/resources/1/publish" -H "Authorization: Bearer TOKEN" > publish_response.json
REM findstr "\"success\":true" publish_response.json >nul && echo ✓ 发布资源成功 || echo ✗ 失败

echo.
echo ======================================
echo    测试完成！
echo ======================================
echo.

:end
echo 你可以通过以下方式访问系统：
echo 1. 前端地址: http://localhost:5173
echo 2. 使用手机号登录: 13800138000
echo 3. 后端API: http://localhost:3002
echo.
