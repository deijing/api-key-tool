const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('========================================');
  console.log('[setupProxy] 代理配置已加载!');
  console.log('[setupProxy] 模拟Vercel云函数代理');
  console.log('========================================');

  // Vercel云函数代理模拟 - 支持通过请求头指定目标地址
  // 艹!这个设计完美模拟了Vercel云函数的行为
  const cloudFunctionProxy = createProxyMiddleware({
    target: 'http://placeholder.com',  // 占位符,实际目标由router决定
    changeOrigin: true,
    secure: false,
    followRedirects: true,  // 显式开启,让代理内部处理重定向,避免浏览器跨域
    logLevel: 'debug',
    pathRewrite: (path, req) => {
      // 移除 /api/proxy 前缀,保留实际API路径
      const newPath = path.replace(/^\/api\/proxy/, '');
      console.log('[Proxy] 路径重写:', path, '->', newPath);
      return newPath;
    },
    router: (req) => {
      // 从请求头获取目标API地址
      const targetBaseUrl = req.headers['x-target-baseurl'];
      if (targetBaseUrl) {
        console.log('[Proxy] 动态代理到:', targetBaseUrl);
        return targetBaseUrl;
      }
      // 如果没有指定目标,使用默认地址
      const defaultUrl = process.env.REACT_APP_BASE_URL || 'https://api.ikuncode.cc';
      console.log('[Proxy] 使用默认地址:', defaultUrl);
      return defaultUrl;
    },
    onProxyRes: (proxyRes, req, res) => {
      // 备用保险:处理重定向,把Location头重写为同源路径,防止浏览器跨域
      // 注意:由于设置了followRedirects=true,代理会内部处理大部分重定向
      // 此逻辑仅在某些边界情况下触发
      const location = proxyRes.headers['location'];
      const redirectStatuses = [301, 302, 303, 307, 308];

      if (location && redirectStatuses.includes(proxyRes.statusCode)) {
        console.log('[Proxy] 检测到重定向 (%d):', proxyRes.statusCode, location);

        try {
          // 解析重定向URL,提取pathname和search
          let redirectUrl;
          if (location.startsWith('http://') || location.startsWith('https://')) {
            // 绝对URL
            redirectUrl = new URL(location);
          } else if (location.startsWith('/')) {
            // 绝对路径(相对于域名)
            const targetBase = req.headers['x-target-baseurl'] || 'http://placeholder.com';
            redirectUrl = new URL(location, targetBase);
          } else {
            // 相对路径(相对于当前请求路径)
            // 需要基于上游完整路径来解析,而不是 /api/proxy/...
            console.log('[Proxy] 相对路径重定向:', location);
            const targetBase = req.headers['x-target-baseurl'] || 'http://placeholder.com';
            // 获取原始请求路径(已经通过pathRewrite移除了/api/proxy前缀)
            const originalPath = req.url;
            const fullUpstreamUrl = new URL(originalPath, targetBase);
            redirectUrl = new URL(location, fullUpstreamUrl);
          }

          // 重写为同源路径:/api/proxy + pathname + search
          const rewrittenPath = `/api/proxy${redirectUrl.pathname}${redirectUrl.search}`;
          proxyRes.headers['location'] = rewrittenPath;
          console.log('[Proxy] 重定向已重写为同源路径:', rewrittenPath);

        } catch (err) {
          console.error('[Proxy] 重写重定向失败,保留原始Location:', err.message);
          // 保留原始Location,让代理按默认行为处理
        }
      }
    },
  });

  // 注册 /api/proxy 路径代理(模拟Vercel云函数)
  app.use('/api/proxy', cloudFunctionProxy);
  console.log('[setupProxy] /api/proxy 云函数代理已注册');
};
