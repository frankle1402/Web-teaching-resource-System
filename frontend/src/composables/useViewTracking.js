/**
 * 浏览时长追踪 composable
 * 使用 Page Visibility API 追踪用户实际活动时间
 * 支持心跳上报和页面关闭时的 sendBeacon 上报
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { viewAPI } from '@/api/view'

// 心跳间隔（30秒）
const HEARTBEAT_INTERVAL = 30 * 1000

/**
 * 浏览时长追踪 composable
 * @param {number|string} resourceId - 资源ID
 * @param {object} options - 配置选项
 * @param {boolean} options.autoStart - 是否自动开始追踪，默认 true
 */
export function useViewTracking(resourceId, options = {}) {
  const { autoStart = true } = options

  // 状态
  const viewId = ref(null)
  const isTracking = ref(false)
  const duration = ref(0) // 累计时长（秒）
  const isVisible = ref(true)

  // 内部状态
  let startTime = null
  let lastActiveTime = null
  let heartbeatTimer = null
  let durationTimer = null

  /**
   * 开始追踪
   */
  async function startTracking() {
    if (isTracking.value || !resourceId) return

    try {
      const result = await viewAPI.startView({
        resourceId: Number(resourceId),
        userAgent: navigator.userAgent
      })

      viewId.value = result.viewId
      isTracking.value = true
      startTime = Date.now()
      lastActiveTime = Date.now()
      duration.value = 0

      // 启动定时器
      startTimers()

      // 添加页面可见性监听
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // 添加页面关闭监听
      window.addEventListener('beforeunload', handleBeforeUnload)
      window.addEventListener('pagehide', handlePageHide)

      console.log('[ViewTracking] 开始追踪, viewId:', viewId.value)
    } catch (error) {
      console.error('[ViewTracking] 开始追踪失败:', error)
    }
  }

  /**
   * 停止追踪
   */
  async function stopTracking() {
    if (!isTracking.value || !viewId.value) return

    try {
      // 计算最终时长
      const finalDuration = calculateCurrentDuration()

      await viewAPI.endView(viewId.value, { duration: finalDuration })

      console.log('[ViewTracking] 停止追踪, 总时长:', finalDuration, '秒')
    } catch (error) {
      console.error('[ViewTracking] 停止追踪失败:', error)
    } finally {
      cleanup()
    }
  }

  /**
   * 发送心跳
   */
  async function sendHeartbeat() {
    if (!isTracking.value || !viewId.value || !isVisible.value) return

    try {
      const currentDuration = calculateCurrentDuration()
      await viewAPI.heartbeat(viewId.value, { duration: currentDuration })
      duration.value = currentDuration
      console.log('[ViewTracking] 心跳发送, 当前时长:', currentDuration, '秒')
    } catch (error) {
      console.error('[ViewTracking] 心跳发送失败:', error)
    }
  }

  /**
   * 计算当前累计时长
   */
  function calculateCurrentDuration() {
    if (!lastActiveTime) return duration.value
    if (!isVisible.value) return duration.value

    const now = Date.now()
    const additionalTime = Math.floor((now - lastActiveTime) / 1000)
    return duration.value + additionalTime
  }

  /**
   * 启动定时器
   */
  function startTimers() {
    // 心跳定时器
    heartbeatTimer = setInterval(() => {
      sendHeartbeat()
    }, HEARTBEAT_INTERVAL)

    // 时长更新定时器（每秒更新显示）
    durationTimer = setInterval(() => {
      if (isVisible.value) {
        duration.value = calculateCurrentDuration()
      }
    }, 1000)
  }

  /**
   * 停止定时器
   */
  function stopTimers() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  /**
   * 处理页面可见性变化
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      // 页面隐藏 - 暂停计时
      isVisible.value = false
      // 保存当前累计时长
      duration.value = calculateCurrentDuration()
      console.log('[ViewTracking] 页面隐藏, 暂停计时, 已累计:', duration.value, '秒')
    } else {
      // 页面显示 - 恢复计时
      isVisible.value = true
      lastActiveTime = Date.now()
      console.log('[ViewTracking] 页面显示, 恢复计时')
    }
  }

  /**
   * 处理页面即将关闭
   */
  function handleBeforeUnload() {
    if (!isTracking.value || !viewId.value) return

    const finalDuration = calculateCurrentDuration()

    // 使用 sendBeacon 发送最终数据
    const data = JSON.stringify({ duration: finalDuration })
    const blob = new Blob([data], { type: 'application/json' })
    const url = `/api/views/${viewId.value}/end`

    try {
      navigator.sendBeacon(url, blob)
      console.log('[ViewTracking] sendBeacon 发送成功, 最终时长:', finalDuration, '秒')
    } catch (error) {
      console.error('[ViewTracking] sendBeacon 发送失败:', error)
    }
  }

  /**
   * 处理页面隐藏（移动端）
   */
  function handlePageHide(event) {
    // persisted 为 true 表示页面进入 bfcache，不是真正关闭
    if (!event.persisted) {
      handleBeforeUnload()
    }
  }

  /**
   * 清理资源
   */
  function cleanup() {
    stopTimers()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handlePageHide)

    isTracking.value = false
    viewId.value = null
    startTime = null
    lastActiveTime = null
  }

  /**
   * 格式化时长为可读字符串
   */
  function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`
    } else {
      return `${secs}秒`
    }
  }

  // 生命周期
  onMounted(() => {
    if (autoStart && resourceId) {
      startTracking()
    }
  })

  onUnmounted(() => {
    if (isTracking.value) {
      stopTracking()
    } else {
      cleanup()
    }
  })

  return {
    // 状态
    viewId,
    isTracking,
    duration,
    isVisible,

    // 方法
    startTracking,
    stopTracking,
    sendHeartbeat,
    formatDuration,

    // 计算属性
    formattedDuration: () => formatDuration(duration.value)
  }
}

export default useViewTracking
