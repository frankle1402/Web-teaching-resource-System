<template>
  <section id="materials" class="materials">
    <div class="container">
      <SectionHeader
        title="支持的材料类型"
        subtitle="全面覆盖医学教育教学场景"
      />
      <div class="materials-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="tab-content">
        <div class="material-list">
          <div
            v-for="item in currentMaterials"
            :key="item.title"
            class="material-item"
          >
            <h4>{{ item.icon }} {{ item.title }}</h4>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import SectionHeader from '@/components/home/SectionHeader.vue'

const activeTab = ref('courses')

const tabs = [
  { id: 'courses', label: '理论课程' },
  { id: 'clinical', label: '临床教学' },
  { id: 'experiment', label: '实验教学' },
  { id: 'assessment', label: '考核评估' }
]

const materials = {
  courses: [
    {
      icon: '📚',
      title: '讲课课件（PPT）',
      description: '结构化教学幻灯片，包含知识点梳理、图表示例、重点标注'
    },
    {
      icon: '📝',
      title: '教学讲稿',
      description: '详细的授课讲解文本，适合备课和在线课程录制'
    },
    {
      icon: '📖',
      title: '学习指南',
      description: '学生自主学习的指导材料，包含预习要点和复习提纲'
    },
    {
      icon: '📋',
      title: '课程大纲',
      description: '完整的课程教学计划，包含课时分配和教学目标'
    }
  ],
  clinical: [
    {
      icon: '🏥',
      title: '临床案例',
      description: '真实病例描述，包含病史、症状、检查结果和诊断过程'
    },
    {
      icon: '🔬',
      title: '病例讨论指南',
      description: '引导学生进行病例分析的讨论问题和参考答案'
    },
    {
      icon: '💉',
      title: '操作示范脚本',
      description: '临床操作流程的详细说明和注意事项'
    },
    {
      icon: '📊',
      title: '临床思维训练',
      description: '培养诊断推理能力的情景化训练材料'
    }
  ],
  experiment: [
    {
      icon: '🧪',
      title: '实验指导书',
      description: '完整的实验流程说明，包含目的、原理、步骤和报告要求'
    },
    {
      icon: '🔬',
      title: '实验报告模板',
      description: '标准化的实验报告格式，便于学生填写和教师批改'
    },
    {
      icon: '⚗️',
      title: '实验安全须知',
      description: '实验室安全规范和应急处理流程'
    },
    {
      icon: '📈',
      title: '数据分析指南',
      description: '实验数据处理和结果分析的方法说明'
    }
  ],
  assessment: [
    {
      icon: '✅',
      title: '测验题库',
      description: '单选、多选、判断题，支持不同难度和知识点覆盖'
    },
    {
      icon: '📝',
      title: '期末试卷',
      description: '符合教学大纲要求的完整试卷，包含答案和评分标准'
    },
    {
      icon: '🎯',
      title: '案例分析题',
      description: '综合性案例分析题目，考察应用能力和临床思维'
    },
    {
      icon: '📊',
      title: '学习评估表',
      description: '教学效果评估和学生反馈收集工具'
    }
  ]
}

const currentMaterials = computed(() => materials[activeTab.value])
</script>

<script>
export default {
  name: 'MaterialsSection'
}
</script>

<style scoped>
.materials {
  padding: 5rem 0;
  background: #ffffff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.materials-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.75rem 2rem;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.tab-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.tab-btn.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.material-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.material-item {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #2563eb;
  transition: all 0.3s;
}

.material-item:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.material-item h4 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.material-item p {
  color: #6b7280;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .materials {
    padding: 3rem 0;
  }

  .materials-tabs {
    gap: 0.5rem;
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .material-list {
    grid-template-columns: 1fr;
  }
}
</style>
