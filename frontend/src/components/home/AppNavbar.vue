<template>
  <nav class="navbar">
    <div class="container">
      <div class="nav-brand">
        <h1>医教智创<span class="beta-tag">Beta</span></h1>
        <span class="tagline">智能医学教育平台</span>
      </div>
      <ul class="nav-menu">
        <li><a href="#features" @click.prevent="scrollTo('features')">核心功能</a></li>
        <li><a href="#how-it-works" @click.prevent="scrollTo('how-it-works')">使用流程</a></li>
        <li><a href="#materials" @click.prevent="scrollTo('materials')">材料类型</a></li>
        <li><a href="#pricing" @click.prevent="scrollTo('pricing')">价格方案</a></li>
      </ul>
      <div class="nav-cta">
        <template v-if="userStore.isLoggedIn">
          <router-link to="/dashboard" class="btn btn-primary">
            进入系统
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-primary">
            免费试用
          </router-link>
        </template>
      </div>
      <!-- 移动端菜单按钮 -->
      <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    <!-- 移动端菜单 -->
    <div class="mobile-menu" :class="{ active: mobileMenuOpen }">
      <ul>
        <li><a href="#features" @click="closeMenuAndScroll('features')">核心功能</a></li>
        <li><a href="#how-it-works" @click="closeMenuAndScroll('how-it-works')">使用流程</a></li>
        <li><a href="#materials" @click="closeMenuAndScroll('materials')">材料类型</a></li>
        <li><a href="#pricing" @click="closeMenuAndScroll('pricing')">价格方案</a></li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const mobileMenuOpen = ref(false)

const scrollTo = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const closeMenuAndScroll = (id) => {
  mobileMenuOpen.value = false
  setTimeout(() => scrollTo(id), 100)
}
</script>

<script>
export default {
  name: 'AppNavbar'
}
</script>

<style scoped>
.navbar {
  background: #ffffff;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 1rem 0;
}

.navbar .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand h1 {
  font-size: 1.5rem;
  color: #2563eb;
  margin: 0 0 0.25rem 0;
}

.beta-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 4px;
  vertical-align: middle;
}

.nav-brand .tagline {
  font-size: 0.75rem;
  color: #6b7280;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 2rem;
  margin: 0;
  padding: 0;
}

.nav-menu a {
  text-decoration: none;
  color: #1f2937;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-menu a:hover {
  color: #2563eb;
}

.nav-cta {
  display: flex;
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

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.mobile-menu-btn span {
  width: 24px;
  height: 2px;
  background: #1f2937;
  transition: all 0.3s;
}

/* 移动端菜单 */
.mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
}

.mobile-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mobile-menu li {
  border-bottom: 1px solid #e5e7eb;
}

.mobile-menu li:last-child {
  border-bottom: none;
}

.mobile-menu a {
  display: block;
  padding: 1rem 20px;
  text-decoration: none;
  color: #1f2937;
  font-weight: 500;
}

.mobile-menu a:hover {
  background: #f9fafb;
  color: #2563eb;
}

/* 响应式设计 */
@media (max-width: 968px) {
  .nav-menu {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .mobile-menu {
    display: none;
  }

  .mobile-menu.active {
    display: block;
  }

  .nav-cta {
    display: none;
  }
}

@media (max-width: 640px) {
  .nav-brand h1 {
    font-size: 1.25rem;
  }
}
</style>
