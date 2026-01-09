<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-section">
          <h4>产品</h4>
          <ul>
            <li><a href="#features" @click.prevent="scrollTo('features')">核心功能</a></li>
            <li><a href="#pricing" @click.prevent="scrollTo('pricing')">价格方案</a></li>
            <li><a href="#">使用案例</a></li>
            <li><a href="#">更新日志</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>资源</h4>
          <ul>
            <li><a href="#">帮助中心</a></li>
            <li><a href="#">视频教程</a></li>
            <li><a href="#">教学指南</a></li>
            <li><a href="#">API文档</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>关于</h4>
          <ul>
            <li><a href="#">关于我们</a></li>
            <li><a href="#">联系我们</a></li>
            <li><a href="#">加入我们</a></li>
            <li><a href="#">合作伙伴</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>联系我们</h4>
          <p>邮箱：contact@yijiaozhichuang.com</p>
          <p>电话：400-123-4567</p>
          <p>地址：天津市河西区某某大厦</p>
          <div class="social-links">
            <a href="#" aria-label="微信">微信</a>
            <a href="#" aria-label="微博">微博</a>
            <a href="#" aria-label="知乎">知乎</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2025 医教智创. All rights reserved. | <a href="#">隐私政策</a> | <a href="#">服务条款</a></p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const scrollTo = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<script>
export default {
  name: 'AppFooter'
}
</script>

<style scoped>
.footer {
  background: #1f2937;
  color: white;
  padding: 3rem 0 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  margin-bottom: 2rem;
}

.footer-section h4 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: white;
}

.footer-section ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.footer-section ul li {
  margin-bottom: 0.5rem;
}

.footer-section a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.3s;
}

.footer-section a:hover {
  color: white;
}

.footer-section p {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
}

.social-links {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.social-links a {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: background 0.3s;
}

.social-links a:hover {
  background: rgba(255, 255, 255, 0.2);
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.footer-bottom p {
  margin: 0;
}

.footer-bottom a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
}

.footer-bottom a:hover {
  color: white;
}
</style>
