const axios = require('axios');

async function testFullFlow() {
  console.log('=== 完整测试流程 ===\n');
  
  // 1. 登录获取Token
  console.log('1. 登录...');
  const loginRes = await axios.post('http://localhost:3002/api/auth/mock-login', {
    phone: '13900139000'
  });
  
  const TOKEN = loginRes.data.data.token;
  console.log('✓ 登录成功，Token:', TOKEN.substring(0, 30) + '...\n');
  
  // 2. 创建资源（不使用模板）
  console.log('2. 创建资源（无模板）...');
  try {
    const createRes = await axios.post('http://localhost:3002/api/resources', {
      title: '心肺复苏技术',
      courseName: '急救学',
      courseLevel: '本科',
      major: '临床医学',
      subject: '心肺复苏',
      contentHtml: '<h1>心肺复苏技术</h1><p>这是一个简单的教学内容测试。</p>',
      status: 'draft'
    }, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ 创建成功');
    console.log('资源ID:', createRes.data.data.id);
    console.log('资源标题:', createRes.data.data.title);
    console.log('状态:', createRes.data.data.status);
    console.log('\n=== 测试成功 ===');
  } catch (error) {
    console.error('✗ 创建失败');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
    if (error.response?.status === 500) {
      console.error('\n后端日志中应该有详细错误信息');
    }
  }
}

testFullFlow().catch(console.error);
