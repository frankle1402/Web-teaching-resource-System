const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

async function testCompleteFlow() {
  console.log('====================================');
  console.log('  完整功能测试');
  console.log('====================================\n');

  let token = '';
  let resourceId = '';

  // 1. 测试登录
  console.log('【1/4】测试用户登录...');
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/mock-login`, {
      phone: '13900139000'
    });

    if (loginRes.data.success) {
      token = loginRes.data.data.token;
      console.log('✓ 登录成功');
      console.log('  用户ID:', loginRes.data.data.userId);
      console.log('  Token:', token.substring(0, 30) + '...\n');
    } else {
      throw new Error('登录响应格式错误');
    }
  } catch (error) {
    console.error('✗ 登录失败');
    console.error('  状态码:', error.response?.status);
    console.error('  错误:', error.response?.data || error.message);
    console.error('\n请检查后端日志中的详细错误信息\n');
    process.exit(1);
  }

  // 2. 测试保存草稿
  console.log('【2/4】测试保存资源（草稿）...');
  try {
    const draftRes = await axios.post(`${API_BASE}/resources`, {
      title: '心肺复苏技术',
      courseName: '急救护理学',
      courseLevel: '本科',
      major: '护理学',
      subject: '心肺复苏',
      contentHtml: '<h1>心肺复苏技术</h1><p>心肺复苏（CPR）是一项重要的急救技术...</p>',
      status: 'draft'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (draftRes.data.success) {
      resourceId = draftRes.data.data.id;
      console.log('✓ 草稿保存成功');
      console.log('  资源ID:', resourceId);
      console.log('  标题:', draftRes.data.data.title);
      console.log('  状态:', draftRes.data.data.status);
      console.log('  UUID:', draftRes.data.data.uuid, '\n');
    } else {
      throw new Error('保存草稿响应格式错误');
    }
  } catch (error) {
    console.error('✗ 保存草稿失败');
    console.error('  状态码:', error.response?.status);
    console.error('  错误:', error.response?.data || error.message);
    console.error('\n请检查后端日志中的详细错误信息\n');
    process.exit(1);
  }

  // 3. 测试发布资源（先创建新资源并直接发布）
  console.log('【3/4】测试发布资源...');
  try {
    const publishRes = await axios.post(`${API_BASE}/resources`, {
      title: '静脉注射操作技术',
      courseName: '基础护理学',
      courseLevel: '高职',
      major: '护理',
      subject: '静脉注射',
      contentHtml: '<h1>静脉注射操作技术</h1><p>静脉注射是临床护理工作中最常用的给药方法之一...</p>',
      status: 'published'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (publishRes.data.success) {
      console.log('✓ 资源发布成功');
      console.log('  资源ID:', publishRes.data.data.id);
      console.log('  标题:', publishRes.data.data.title);
      console.log('  状态:', publishRes.data.data.status);
      console.log('  UUID:', publishRes.data.data.uuid, '\n');
    } else {
      throw new Error('发布资源响应格式错误');
    }
  } catch (error) {
    console.error('✗ 发布资源失败');
    console.error('  状态码:', error.response?.status);
    console.error('  错误:', error.response?.data || error.message);
    console.error('\n请检查后端日志中的详细错误信息\n');
    process.exit(1);
  }

  // 4. 测试获取资源列表
  console.log('【4/4】测试获取资源列表...');
  try {
    const listRes = await axios.get(`${API_BASE}/resources?page=1&pageSize=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (listRes.data.success) {
      const list = listRes.data.data.list;
      console.log('✓ 获取资源列表成功');
      console.log('  总数:', listRes.data.data.pagination.total);
      console.log('  本页:', list.length, '条');
      list.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.title} (${item.status})`);
      });
      console.log('');
    } else {
      throw new Error('获取列表响应格式错误');
    }
  } catch (error) {
    console.error('✗ 获取资源列表失败');
    console.error('  状态码:', error.response?.status);
    console.error('  错误:', error.response?.data || error.message);
    console.error('\n请检查后端日志中的详细错误信息\n');
    process.exit(1);
  }

  console.log('====================================');
  console.log('  ✓ 所有测试通过！');
  console.log('====================================\n');
}

testCompleteFlow().catch(error => {
  console.error('\n✗ 测试过程中发生未捕获错误:', error.message);
  process.exit(1);
});
