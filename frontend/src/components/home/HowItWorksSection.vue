<template>
  <section id="how-it-works" class="how-it-works">
    <div class="container">
      <SectionHeader
        title="使用流程"
        subtitle="三步即可生成专业教学材料，简单高效"
      />
      <div class="steps-container">
        <div class="step">
          <div class="step-number">1</div>
          <h3>输入需求</h3>
          <p>填写课程信息、教学目标、目标学生群体等基本信息，或上传教学大纲作为参考。</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>AI生成</h3>
          <p>系统根据您的需求，运用医学知识库和教学原理，快速生成初稿材料。</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>编辑优化</h3>
          <p>在线编辑生成的材料，调整内容、格式和风格，导出为PPT、PDF、Word等格式。</p>
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
  name: 'HowItWorksSection'
}
</script>

<style scoped>
.how-it-works {
  padding: 5rem 0;
  background: #f9fafb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.steps-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
}

.step {
  flex: 1;
  text-align: center;
  max-width: 300px;
}

.step-number {
  width: 60px;
  height: 60px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 auto 1.5rem;
}

.step h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.step p {
  color: #6b7280;
  line-height: 1.8;
}

.step-arrow {
  font-size: 2rem;
  color: #2563eb;
  margin-top: 2rem;
}

@media (max-width: 968px) {
  .steps-container {
    flex-direction: column;
    align-items: center;
  }

  .step-arrow {
    transform: rotate(90deg);
    margin: 1rem 0;
  }
}

@media (max-width: 640px) {
  .how-it-works {
    padding: 3rem 0;
  }
}
</style>
