import request from './request'

export const uploadAPI = {
  /**
   * 上传并解析教案文件
   * @param {File} file - 要上传的文件
   */
  parseDocument(file) {
    const formData = new FormData()
    formData.append('file', file)

    return request({
      url: '/api/upload/parse-document',
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60秒超时
    })
  },

  /**
   * 根据教案内容生成大纲
   * @param {Object} data - 包含 content, courseName, courseLevel, major, subject, teachingMethod
   */
  generateOutline(data) {
    return request({
      url: '/api/upload/generate-outline',
      method: 'POST',
      data,
      timeout: 120000 // 120秒超时
    })
  }
}
