import request from '@/api/request'

/**
 * 文件夹管理API
 */
export const folderAPI = {
  /**
   * 获取文件夹树
   */
  getTree() {
    return request({
      url: '/folders',
      method: 'get'
    })
  },

  /**
   * 创建文件夹
   */
  create(data) {
    return request({
      url: '/folders',
      method: 'post',
      data
    })
  },

  /**
   * 更新文件夹
   */
  update(id, data) {
    return request({
      url: `/folders/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除文件夹
   */
  delete(id) {
    return request({
      url: `/folders/${id}`,
      method: 'delete'
    })
  }
}
