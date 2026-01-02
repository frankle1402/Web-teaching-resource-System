/**
 * 错误处理中间件
 */
function errorMiddleware(err, req, res, next) {
  console.error('服务器错误:', err);

  // 如果响应已发送，则交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 返回错误响应
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: Date.now()
  });
}

module.exports = errorMiddleware;
