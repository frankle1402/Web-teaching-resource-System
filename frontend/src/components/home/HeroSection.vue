<template>
  <section class="hero">
    <div class="container">
      <div class="hero-content">
        <h2 class="hero-title">AI驱动的医学教学材料生成平台</h2>
        <p class="hero-subtitle">
          为医学院校教师量身打造，快速生成高质量教学课件、案例、测验题库等专业教学材料，
          提升教学效率，专注于教学创新。
        </p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-large" @click="scrollTo('pricing')">
            立即开始使用
          </button>
          <button class="btn btn-secondary btn-large" @click="scrollTo('features')">
            了解更多
          </button>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-number">10,000+</div>
            <div class="stat-label">生成材料数量</div>
          </div>
          <div class="stat">
            <div class="stat-number">500+</div>
            <div class="stat-label">合作院校</div>
          </div>
          <div class="stat">
            <div class="stat-number">98%</div>
            <div class="stat-label">用户满意度</div>
          </div>
        </div>
      </div>
      <div class="hero-image">
        <template v-if="!userStore.isLoggedIn">
          <LoginForm />
        </template>
        <template v-else>
          <UserInfoCard />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useUserStore } from '@/store/modules/user'
import LoginForm from '@/components/home/LoginForm.vue'
import UserInfoCard from '@/components/home/UserInfoCard.vue'

const userStore = useUserStore()

const scrollTo = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<script>
export default {
  name: 'HeroSection'
}
</script>

<style scoped>
.hero {
  padding: 5rem 0;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.hero .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.8;
}

.hero-cta {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.stat {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6b7280;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
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

.btn-secondary {
  background: #ffffff;
  color: #2563eb;
  border: 2px solid #2563eb;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

/* 响应式设计 */
@media (max-width: 968px) {
  .hero .container {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-content {
    text-align: center;
  }

  .hero-cta {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 3rem 0;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-cta {
    flex-direction: column;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
