import request from '@/api/request'

/**
 * 收藏夹管理API
 */
export const favoriteAPI = {
  // ==================== 收藏文件夹相关 ====================

  /**
   * 获取收藏文件夹树
   */
  getFolders() {
    return request({
      url: '/favorites/folders',
      method: 'get'
    })
  },

  /**
   * 创建收藏文件夹
   */
  createFolder(data) {
    return request({
      url: '/favorites/folders',
      method: 'post',
      data
    })
  },

  /**
   * 更新收藏文件夹
   */
  updateFolder(id, data) {
    return request({
      url: `/favorites/folders/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除收藏文件夹
   */
  deleteFolder(id) {
    return request({
      url: `/favorites/folders/${id}`,
      method: 'delete'
    })
  },

  // ==================== 收藏资源相关 ====================

  /**
   * 获取收藏列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.folderId - 文件夹ID（'all'|'uncategorized'|数字ID）
   * @param {string} params.type - 类型筛选（'bilibili'|'wechat_article'|'image'）
   * @param {string} params.keyword - 关键词搜索
   */
  getList(params) {
    return request({
      url: '/favorites',
      method: 'get',
      params
    })
  },

  /**
   * 获取收藏详情
   */
  getById(id) {
    return request({
      url: `/favorites/${id}`,
      method: 'get'
    })
  },

  /**
   * 添加收藏
   * @param {Object} data - 收藏数据
   * @param {string} data.type - 类型（'bilibili'|'wechat_article'|'image'）
   * @param {string} data.title - 标题
   * @param {string} data.sourceUrl - 原始URL
   * @param {string} data.description - 描述
   * @param {string} data.thumbnailUrl - 封面图URL
   * @param {number} data.folderId - 文件夹ID
   * @param {string} data.bvid - B站视频BV号
   * @param {number} data.videoDuration - 视频时长
   * @param {string} data.authorName - UP主名称
   * @param {number} data.playCount - 播放量
   * @param {string} data.articleAuthor - 公众号名称
   * @param {string} data.publishTime - 发布时间
   * @param {string} data.localPath - 本地存储路径
   * @param {string} data.originalFilename - 原始文件名
   * @param {number} data.fileSize - 文件大小
   * @param {string} data.mimeType - MIME类型
   * @param {number} data.width - 图片宽度
   * @param {number} data.height - 图片高度
   */
  create(data) {
    return request({
      url: '/favorites',
      method: 'post',
      data
    })
  },

  /**
   * 更新收藏
   */
  update(id, data) {
    return request({
      url: `/favorites/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除收藏
   */
  delete(id) {
    return request({
      url: `/favorites/${id}`,
      method: 'delete'
    })
  },

  /**
   * 批量删除收藏
   */
  batchDelete(ids) {
    return request({
      url: '/favorites/batch-delete',
      method: 'post',
      data: { ids }
    })
  },

  /**
   * 批量移动收藏
   */
  batchMove(ids, folderId) {
    return request({
      url: '/favorites/batch-move',
      method: 'post',
      data: { ids, folderId }
    })
  },

  // ==================== 元数据抓取 ====================

  /**
   * 抓取B站视频元数据
   * @param {string} url - B站视频URL
   */
  fetchBilibiliMeta(url) {
    return request({
      url: '/favorites/meta/bilibili',
      method: 'get',
      params: { url }
    })
  },

  /**
   * 抓取公众号文章元数据
   * @param {string} url - 公众号文章URL
   */
  fetchWechatMeta(url) {
    return request({
      url: '/favorites/meta/wechat',
      method: 'get',
      params: { url }
    })
  },

  /**
   * 上传/下载图片
   * @param {Object} data - 图片数据
   * @param {string} data.url - 图片URL（从URL下载）
   * @param {File} data.file - 图片文件（本地上传）
   */
  uploadImage(data) {
    if (data.file) {
      // 本地上传
      const formData = new FormData()
      formData.append('file', data.file)
      return request({
        url: '/favorites/upload/image',
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    } else {
      // 从URL下载
      return request({
        url: '/favorites/upload/image',
        method: 'post',
        data: { url: data.url }
      })
    }
  },

  /**
   * 获取收藏图片的访问URL
   * @param {string} localPath - 本地路径
   * @returns {string} - 完整的图片访问URL
   */
  getImageUrl(localPath) {
    if (!localPath) return ''
    // 从localPath提取UUID
    const filename = localPath.split('/').pop()
    const uuid = filename.split('.')[0]
    return `/api/favorites/images/${uuid}`
  },

  // ==================== 辅助方法 ====================

  /**
   * 从B站URL提取BV号
   */
  extractBilibiliId(url) {
    if (!url) return null
    const bvMatch = url.match(/BV[a-zA-Z0-9]+/)
    return bvMatch ? bvMatch[0] : null
  },

  /**
   * 生成B站视频嵌入代码
   */
  generateBilibiliEmbed(bvid) {
    if (!bvid) return ''
    return `<div class="video-container" style="position: relative; width: 100%; min-height: 600px; aspect-ratio: 16/9; overflow: hidden;">
  <iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0" scrolling="no" frameborder="no" allowfullscreen="true" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; min-height: 600px;"></iframe>
</div>`
  },

  /**
   * 格式化视频时长
   */
  formatDuration(seconds) {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  /**
   * 格式化播放量
   */
  formatPlayCount(count) {
    if (!count) return '0'
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万'
    }
    return count.toString()
  }
}
