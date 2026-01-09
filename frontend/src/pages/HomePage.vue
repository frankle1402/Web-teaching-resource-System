<template>
  <div class="home-page">
    <AppNavbar />
    <HeroSection />
    <FeaturesSection />
    <HowItWorksSection />
    <MaterialsSection />
    <PricingSection />
    <CtaSection />
    <AppFooter />
  </div>
</template>

<script setup>
import AppNavbar from '@/components/home/AppNavbar.vue'
import HeroSection from '@/components/home/HeroSection.vue'
import FeaturesSection from '@/components/home/FeaturesSection.vue'
import HowItWorksSection from '@/components/home/HowItWorksSection.vue'
import MaterialsSection from '@/components/home/MaterialsSection.vue'
import PricingSection from '@/components/home/PricingSection.vue'
import CtaSection from '@/components/home/CtaSection.vue'
import AppFooter from '@/components/home/AppFooter.vue'
</script>

<script>
export default {
  name: 'HomePage'
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}
</style>
