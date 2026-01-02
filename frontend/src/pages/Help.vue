<template>
  <div class="placeholder-page">
    <el-result icon="info" title="功能开发中" sub-title="此功能将在后续版本中实现">
      <template #extra>
        <el-button type="primary" @click="$router.back()">返回</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
// 占位页面
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
</style>
