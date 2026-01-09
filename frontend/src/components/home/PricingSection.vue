<template>
  <section id="pricing" class="pricing">
    <div class="container">
      <SectionHeader
        title="价格方案"
        subtitle="选择适合您的方案，开始智能教学之旅"
      />
      <div class="pricing-grid">
        <div class="pricing-card">
          <div class="pricing-header">
            <h3>基础版</h3>
            <div class="price">
              <span class="currency">¥</span>
              <span class="amount">0</span>
              <span class="period">/月</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li>✓ 每月生成10份材料</li>
            <li>✓ 基础模板支持</li>
            <li>✓ PDF导出</li>
            <li>✓ 社区支持</li>
            <li class="not-included">✗ 高级定制功能</li>
            <li class="not-included">✗ 团队协作</li>
          </ul>
          <button class="btn btn-outline">免费注册</button>
        </div>
        <div class="pricing-card featured">
          <div class="popular-badge">推荐</div>
          <div class="pricing-header">
            <h3>专业版</h3>
            <div class="price">
              <span class="currency">¥</span>
              <span class="amount">199</span>
              <span class="period">/月</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li>✓ 无限生成材料</li>
            <li>✓ 全部模板类型</li>
            <li>✓ PPT/Word导出</li>
            <li>✓ 优先技术支持</li>
            <li>✓ 自定义品牌</li>
            <li>✓ 历史记录保存</li>
          </ul>
          <button class="btn btn-primary">立即订阅</button>
        </div>
        <div class="pricing-card">
          <div class="pricing-header">
            <h3>院校版</h3>
            <div class="price">
              <span class="currency">¥</span>
              <span class="amount">定制</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li>✓ 多用户协作</li>
            <li>✓ 私有化部署</li>
            <li>✓ 定制化开发</li>
            <li>✓ 专属客户经理</li>
            <li>✓ 培训服务</li>
            <li>✓ API接口</li>
          </ul>
          <button class="btn btn-outline">联系销售</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHeader from '@/components/home/SectionHeader.vue'
</script>

<script>
export default {
  name: 'PricingSection'
}
</script>

<style scoped>
.pricing {
  padding: 5rem 0;
  background: #f9fafb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.pricing-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s;
}

.pricing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.pricing-card.featured {
  border: 2px solid #2563eb;
  transform: scale(1.05);
}

.pricing-card.featured:hover {
  transform: scale(1.05) translateY(-5px);
}

.popular-badge {
  position: absolute;
  top: -12px;
  right: 20px;
  background: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.pricing-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.pricing-header h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}

.currency {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.amount {
  font-size: 3rem;
  font-weight: 700;
  color: #2563eb;
}

.period {
  font-size: 1rem;
  color: #6b7280;
}

.pricing-features {
  list-style: none;
  margin: 0 0 2rem 0;
  padding: 0;
}

.pricing-features li {
  padding: 0.75rem 0;
  color: #1f2937;
}

.pricing-features li.not-included {
  color: #6b7280;
  text-decoration: line-through;
}

.pricing-card button {
  width: 100%;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-outline {
  background: transparent;
  color: #2563eb;
  border: 2px solid #2563eb;
}

.btn-outline:hover {
  background: #2563eb;
  color: white;
}

@media (max-width: 968px) {
  .pricing-card.featured {
    transform: scale(1);
  }

  .pricing-card.featured:hover {
    transform: translateY(-5px);
  }
}

@media (max-width: 640px) {
  .pricing {
    padding: 3rem 0;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
