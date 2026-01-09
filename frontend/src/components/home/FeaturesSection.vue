<template>
  <section id="features" class="features">
    <div class="container">
      <SectionHeader
        title="核心功能"
        subtitle="专为医学教育设计，全面覆盖教学材料生成需求"
      />
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>智能课件生成</h3>
          <p>基于教学大纲自动生成结构化PPT课件，支持多种医学专业课程，包含图表、案例分析等丰富内容。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📋</div>
          <h3>教学案例创作</h3>
          <p>生成真实、详细的临床案例，包含患者信息、症状描述、诊断过程和治疗方案，培养临床思维。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🧪</div>
          <h3>题库自动生成</h3>
          <p>智能生成选择题、简答题、案例分析题等多种题型，覆盖不同难度等级，支持批量导出。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📖</div>
          <h3>实验指导书</h3>
          <p>自动编写实验课程指导手册，包含实验目的、原理、步骤、注意事项和预期结果。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎥</div>
          <h3>脚本与讲稿</h3>
          <p>为在线课程生成详细的讲解脚本和教师讲稿，确保教学内容连贯、专业。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>学习评估工具</h3>
          <p>生成学习效果评估表、学生反馈问卷等，帮助教师持续改进教学质量。</p>
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
  name: 'FeaturesSection'
}
</script>

<style scoped>
.features {
  padding: 5rem 0;
  background: #ffffff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  border: 1px solid #e5e7eb;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.8;
}

@media (max-width: 640px) {
  .features {
    padding: 3rem 0;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
