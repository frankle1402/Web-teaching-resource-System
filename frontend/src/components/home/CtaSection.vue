<template>
  <section class="cta">
    <div class="container">
      <h2>准备好提升教学效率了吗？</h2>
      <p>加入数千名医学教育工作者的行列，体验AI驱动的教学材料生成</p>
      <div class="cta-buttons">
        <router-link v-if="!userStore.isLoggedIn" to="/login" class="btn btn-primary btn-large">
          免费试用14天
        </router-link>
        <router-link v-else to="/dashboard" class="btn btn-primary btn-large">
          进入系统
        </router-link>
        <button class="btn btn-secondary btn-large" @click="scrollTo('features')">
          了解更多
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useUserStore } from '@/store/modules/user'

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
  name: 'CtaSection'
}
</script>

<style scoped>
.cta {
  padding: 5rem 0;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  text-align: center;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.cta h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
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
  background: white;
  color: #2563eb;
}

.btn-primary:hover {
  background: #f9fafb;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .cta {
    padding: 3rem 0;
  }

  .cta h2 {
    font-size: 1.75rem;
  }

  .cta p {
    font-size: 1rem;
  }

  .cta-buttons {
    flex-direction: column;
  }
}
</style>
