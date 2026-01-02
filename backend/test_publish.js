const axios = require('axios');

async function testPublish() {
  console.log('测试发布资源功能...\n');

  try {
    // 1. 先登录获取token
    const loginRes = await axios.post('http://localhost:3002/api/auth/mock-login', {
      phone: '13800138000'
    });

    const token = loginRes.data.data.token;
    console.log('✓ 登录成功\n');

    // 2. 获取第一个草稿资源
    const listRes = await axios.get('http://localhost:3002/api/resources', {
      params: {
        page: 1,
        pageSize: 10,
        status: 'draft'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const draftResources = listRes.data.data.list;
    if (draftResources.length === 0) {
      console.log('⚠️  没有草稿资源，无法测试发布');
      return;
    }

    const resourceId = draftResources[0].id;
    console.log(`找到草稿资源 ID: ${resourceId}, 标题: ${draftResources[0].title}\n`);

    // 3. 发布资源
    console.log('开始发布资源...');
    const publishRes = await axios.post(
      `http://localhost:3002/api/resources/${resourceId}/publish`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('\n=== 发布结果 ===');
    console.log('状态码:', publishRes.status);
    console.log('成功:', publishRes.data.success);
    console.log('公开URL:', publishRes.data.data?.publicUrl);
    console.log('\n完整响应:');
    console.log(JSON.stringify(publishRes.data, null, 2));

    // 4. 再次获取资源详情，验证状态
    const detailRes = await axios.get(`http://localhost:3002/api/resources/${resourceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n=== 资源详情（发布后）===');
    console.log('状态:', detailRes.data.data.status);
    console.log('公开URL:', detailRes.data.data.public_url);

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应:', error.response.data);
    }
  }
}

testPublish();
