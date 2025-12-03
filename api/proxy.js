/**
 * Vercel Serverless Function - API代理
 * 用于转发前端请求到各个API服务器，解决CORS跨域问题
 *
 * 艹！这个云函数设计得简洁优雅，老王我的杰作！
 */

export default async function handler(req, res) {
  // 设置CORS头，允许所有域名访问（艹，开发环境必须的）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, New-Api-User, X-Target-BaseUrl');

  // 处理OPTIONS预检请求（这个SB浏览器的安全机制）
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 从请求头获取目标API地址
    const targetBaseUrl = req.headers['x-target-baseurl'];

    if (!targetBaseUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少目标API地址（X-Target-BaseUrl头）'
      });
    }

    // 获取请求路径
    // 使用 rewrites 后，req.url 仍然包含完整的原始路径（包括query string）
    // 需要移除 /api/proxy 前缀
    const requestPath = req.url.replace(/^\/api\/proxy/, '') || '/';

    // 构建目标URL（移除baseUrl末尾的斜杠，避免双斜杠）
    const targetUrl = `${targetBaseUrl.replace(/\/+$/, '')}${requestPath}`;

    console.log(`[Proxy] ${req.method} ${req.url} -> ${targetUrl}`);

    // 准备转发的请求头（排除一些不需要的头）
    const forwardHeaders = {};
    const headersToForward = ['authorization', 'content-type', 'new-api-user'];

    for (const key of headersToForward) {
      if (req.headers[key]) {
        forwardHeaders[key] = req.headers[key];
      }
    }

    // 准备fetch配置
    const fetchConfig = {
      method: req.method,
      headers: forwardHeaders,
      redirect: 'manual', // 禁用自动重定向，手动处理
    };

    // 如果有请求体，添加到配置中（POST、PUT等请求）
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchConfig.body = JSON.stringify(req.body);
      if (!forwardHeaders['content-type']) {
        forwardHeaders['content-type'] = 'application/json';
      }
    }

    // 发起请求
    const response = await fetch(targetUrl, fetchConfig);

    console.log(`[Proxy] 响应状态: ${response.status}`);

    // 处理响应：根据状态码和Content-Type智能处理
    const contentType = response.headers.get('content-type') || '';

    // 空响应（204 No Content, 304 Not Modified）
    if (response.status === 204 || response.status === 304) {
      return res.status(response.status).end();
    }

    // JSON响应
    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (error) {
        console.error('[Proxy] JSON解析失败:', error);
        return res.status(500).json({
          success: false,
          message: '上游返回的JSON格式错误'
        });
      }
    }

    // 文本响应（包括HTML、plain text等）
    if (contentType.includes('text/')) {
      const text = await response.text();
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(text);
    }

    // 其他类型：尝试按JSON处理，失败则返回文本
    try {
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch {
      const text = await response.text();
      res.setHeader('Content-Type', contentType || 'text/plain');
      return res.status(response.status).send(text);
    }

  } catch (error) {
    console.error('[Proxy] 请求失败:', error);
    return res.status(500).json({
      success: false,
      message: `代理请求失败: ${error.message}`
    });
  }
}
