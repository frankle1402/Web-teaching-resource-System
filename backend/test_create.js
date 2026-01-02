const axios = require('axios');

async function testCreateResource() {
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInBob25lIjoiMTM5MDAxMzkwMDAiLCJpYXQiOjE3NjczNjY1NzUsImV4cCI6MTc2OTk1ODU3NX0.ls8WVGcQ4Yuy-l7WNXPZB7E7UOQ6pyar_e0TOZyPxvo';
  
  try {
    const response = await axios.post('http://localhost:3002/api/resources', {
      title: '测试资源',
      courseName: '测试课程',
      courseLevel: '高职',
      major: '护理',
      subject: '测试主题',
      contentHtml: '<h1>测试内容</h1>',
      status: 'draft'
    }, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ 成功创建资源');
    console.log('状态码:', response.status);
    console.log('数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('✗ 创建失败');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
  }
}

testCreateResource();
