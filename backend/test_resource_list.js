const axios = require('axios');

async function testResourceList() {
  console.log('测试资源列表接口...\n');

  // 1. 先登录获取token
  const loginRes = await axios.post('http://localhost:3002/api/auth/mock-login', {
    phone: '13800138000'
  });

  const token = loginRes.data.data.token;
  console.log('✓ 登录成功\n');

  // 2. 获取资源列表
  const listRes = await axios.get('http://localhost:3002/api/resources', {
    params: {
      page: 1,
      pageSize: 10,
      keyword: '',
      courseLevel: '',
      status: ''
    },
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('=== 资源列表响应 ===');
  console.log('状态码:', listRes.status);
  console.log('成功:', listRes.data.success);
  console.log('总数:', listRes.data.data?.pagination?.total);
  console.log('当前页:', listRes.data.data?.pagination?.page);
  console.log('资源数:', listRes.data.data?.list?.length);
  console.log('\n=== 资源详情 ===');

  if (listRes.data.data?.list?.length > 0) {
    listRes.data.data.list.forEach((item, idx) => {
      console.log(`\n资源 ${idx + 1}:`);
      console.log('  ID:', item.id);
      console.log('  标题:', item.title);
      console.log('  课程:', item.course_name);
      console.log('  状态:', item.status);
      console.log('  UUID:', item.uuid);
      console.log('  创建时间:', item.created_at);
    });
  } else {
    console.log('⚠️  资源列表为空');
  }

  console.log('\n=== 完整响应数据 ===');
  console.log(JSON.stringify(listRes.data, null, 2));
}

testResourceList().catch(error => {
  console.error('✗ 测试失败:', error.message);
  if (error.response) {
    console.error('状态码:', error.response.status);
    console.error('响应:', error.response.data);
  }
});
