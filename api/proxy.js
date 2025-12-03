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

    // 获取请求路径（移除 /api/proxy 前缀）
    const requestPath = req.url.replace('/api/proxy', '');
    const targetUrl = `${targetBaseUrl}${requestPath}`;

    console.log(`[Proxy] ${req.method} ${targetUrl}`);

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
    const data = await response.json();

    console.log(`[Proxy] 响应状态: ${response.status}`);

    // 返回结果
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('[Proxy] 请求失败:', error);
    return res.status(500).json({
      success: false,
      message: `代理请求失败: ${error.message}`
    });
  }
}
