<template>
  <div class="section-header">
    <h2 class="section-title">{{ title }}</h2>
    <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<script>
export default {
  name: 'SectionHeader'
}
</script>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
}

.section-subtitle {
  font-size: 1.2rem;
  color: #6b7280;
}

@media (max-width: 640px) {
  .section-title {
    font-size: 2rem;
  }
}
</style>
