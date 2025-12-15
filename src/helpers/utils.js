import { toast } from 'react-toastify';
import { toastConstants } from '../constants';

export function isAdmin() {
  let user = localStorage.getItem('user');
  if (!user) return false;
  user = JSON.parse(user);
  return user.role >= 10;
}

export function isRoot() {
  let user = localStorage.getItem('user');
  if (!user) return false;
  user = JSON.parse(user);
  return user.role >= 100;
}

export function getSystemName() {
  let system_name = localStorage.getItem('system_name');
  if (!system_name) return 'One API';
  return system_name;
}

export function getLogo() {
  let logo = localStorage.getItem('logo');
  if (!logo) return '/logo.png';
  return logo
}

export function getFooterHTML() {
  return localStorage.getItem('footer_html');
}

export async function copy(text) {
  let okay = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    okay = false;
    console.error(e);
  }
  return okay;
}

export function isMobile() {
  return window.innerWidth <= 600;
}

let showErrorOptions = { autoClose: toastConstants.ERROR_TIMEOUT };
let showWarningOptions = { autoClose: toastConstants.WARNING_TIMEOUT };
let showSuccessOptions = { autoClose: toastConstants.SUCCESS_TIMEOUT };
let showInfoOptions = { autoClose: toastConstants.INFO_TIMEOUT };
let showNoticeOptions = { autoClose: false };

if (isMobile()) {
  showErrorOptions.position = 'top-center';
  // showErrorOptions.transition = 'flip';

  showSuccessOptions.position = 'top-center';
  // showSuccessOptions.transition = 'flip';

  showInfoOptions.position = 'top-center';
  // showInfoOptions.transition = 'flip';

  showNoticeOptions.position = 'top-center';
  // showNoticeOptions.transition = 'flip';
}

export function showError(error) {
  console.error(error);
  if (error.message) {
    if (error.name === 'AxiosError') {
      switch (error.response.status) {
        case 401:
          // toast.error('错误：未登录或登录已过期，请重新登录！', showErrorOptions);
          // window.location.href = '/login?expired=true';
          break;
        case 429:
          toast.error('错误：请求次数过多，请稍后再试！', showErrorOptions);
          break;
        case 500:
          toast.error('错误：服务器内部错误，请联系管理员！', showErrorOptions);
          break;
        case 405:
          toast.info('本站仅作演示之用，无服务端！');
          break;
        default:
          toast.error('错误：' + error.message, showErrorOptions);
      }
      return;
    }
    toast.error('错误：' + error.message, showErrorOptions);
  } else {
    toast.error('错误：' + error, showErrorOptions);
  }
}

export function showWarning(message) {
  toast.warn(message, showWarningOptions);
}

export function showSuccess(message) {
  toast.success(message, showSuccessOptions);
}

export function showInfo(message) {
  toast.info(message, showInfoOptions);
}

export function showNotice(message) {
  toast.info(message, showNoticeOptions);
}

export function openPage(url) {
  window.open(url);
}

export function removeTrailingSlash(url) {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  } else {
    return url;
  }
}

export function timestamp2string(timestamp) {
  // 自动检测时间戳类型：如果大于10位数，说明是毫秒级；否则是秒级
  // 10位数的最大值是9999999999，对应2286年，足够判断
  const ts = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  let date = new Date(ts);
  let year = date.getFullYear().toString();
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();
  let hour = date.getHours().toString();
  let minute = date.getMinutes().toString();
  let second = date.getSeconds().toString();
  if (month.length === 1) {
    month = '0' + month;
  }
  if (day.length === 1) {
    day = '0' + day;
  }
  if (hour.length === 1) {
    hour = '0' + hour;
  }
  if (minute.length === 1) {
    minute = '0' + minute;
  }
  if (second.length === 1) {
    second = '0' + second;
  }
  return (
    year +
    '-' +
    month +
    '-' +
    day +
    ' ' +
    hour +
    ':' +
    minute +
    ':' +
    second
  );
}

export function downloadTextAsFile(text, filename) {
  let blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export const verifyJSON = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

// 配置管理工具函数
const CONFIG_KEYS = {
  SHOW_DETAIL: 'app_show_detail',
  SHOW_BALANCE: 'app_show_balance',
  BASE_URL: 'app_base_url',  // 已废弃，保留兼容性
  API_CONFIGS: 'app_api_configs',  // API 配置列表
  ACTIVE_API_ID: 'app_active_api_id',  // 当前使用的 API ID
};

// 获取配置项（优先从 localStorage 读取，否则使用环境变量默认值）
export function getConfig(key) {
  const localValue = localStorage.getItem(CONFIG_KEYS[key]);

  if (localValue !== null) {
    // 对于布尔值，需要特殊处理
    if (key === 'SHOW_DETAIL' || key === 'SHOW_BALANCE') {
      return localValue === 'true';
    }
    return localValue;
  }

  // BASE_URL 特殊处理：从当前激活的 API 配置中读取
  if (key === 'BASE_URL') {
    const activeApi = getActiveApiConfig();
    if (activeApi) {
      return activeApi.baseUrl;
    }
  }

  // 如果 localStorage 中没有，返回环境变量的值
  switch (key) {
    case 'SHOW_DETAIL':
      return process.env.REACT_APP_SHOW_DETAIL === 'true';
    case 'SHOW_BALANCE':
      return process.env.REACT_APP_SHOW_BALANCE === 'true';
    case 'BASE_URL':
      return process.env.REACT_APP_BASE_URL || '';
    default:
      return null;
  }
}

// 保存配置项到 localStorage
export function setConfig(key, value) {
  if (CONFIG_KEYS[key]) {
    localStorage.setItem(CONFIG_KEYS[key], String(value));
  }
}

// 获取所有配置
export function getAllConfig() {
  return {
    showDetail: getConfig('SHOW_DETAIL'),
    showBalance: getConfig('SHOW_BALANCE'),
    baseUrl: getConfig('BASE_URL'),
  };
}

// 保存所有配置
export function saveAllConfig(config) {
  if (config.showDetail !== undefined) {
    setConfig('SHOW_DETAIL', config.showDetail);
  }
  if (config.showBalance !== undefined) {
    setConfig('SHOW_BALANCE', config.showBalance);
  }
  if (config.baseUrl !== undefined) {
    setConfig('BASE_URL', config.baseUrl);
  }
}

// 重置所有配置（清除 localStorage，恢复到 .env 默认值）
export function resetConfig() {
  Object.values(CONFIG_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============================================
// API 配置管理函数（多 API 支持）
// ============================================

// 生成唯一 ID
function generateId() {
  return 'api_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取所有 API 配置
export function getAllApiConfigs() {
  const configsJson = localStorage.getItem(CONFIG_KEYS.API_CONFIGS);

  if (!configsJson) {
    // 如果没有配置，从 .env 创建默认配置
    const defaultConfig = {
      id: generateId(),
      name: 'Default API',
      baseUrl: process.env.REACT_APP_BASE_URL || 'https://api.oaipro.com',
      accessToken: '',
      userId: '',
      isActive: true,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      website: '',
    };
    return [defaultConfig];
  }
  try {
    const configs = JSON.parse(configsJson);
    // 规范化和清洗旧数据
    const cleanedConfigs = configs.map(c => {
      // 清洗 baseUrl
      let cleanedBaseUrl = c.baseUrl || '';
      const normalizedBaseUrl = validateAndNormalizeBaseUrl(cleanedBaseUrl);
      if (!normalizedBaseUrl && cleanedBaseUrl) {
        console.warn('[utils] 清洗无效的 baseUrl:', cleanedBaseUrl);
      }

      // 清洗 website
      const cleanedWebsite = validateAndNormalizeWebsite(c.website || '');
      if (c.website && !cleanedWebsite) {
        console.warn('[utils] 清洗无效的 website:', c.website);
      }

      return {
        ...c,
        baseUrl: normalizedBaseUrl || cleanedBaseUrl, // 如果验证失败，保留原值以便用户修复
        website: cleanedWebsite
      };
    });

    // 如果有数据被清洗，更新存储
    const needsUpdate = cleanedConfigs.some((c, i) =>
      c.baseUrl !== configs[i].baseUrl || c.website !== configs[i].website
    );
    if (needsUpdate) {
      console.log('[utils] 检测到旧数据，已自动清洗并更新');
      saveAllApiConfigs(cleanedConfigs);
    }

    return cleanedConfigs;
  } catch (e) {
    console.error('[utils] 解析 API 配置失败:', e);
    return [];
  }
}

// 保存所有 API 配置
export function saveAllApiConfigs(configs) {
  localStorage.setItem(CONFIG_KEYS.API_CONFIGS, JSON.stringify(configs));
}

// 获取当前激活的 API 配置
export function getActiveApiConfig() {
  const configs = getAllApiConfigs();
  const activeId = localStorage.getItem(CONFIG_KEYS.ACTIVE_API_ID);

  if (activeId) {
    const active = configs.find(c => c.id === activeId);
    if (active) return active;
  }

  // 如果没有找到，返回第一个标记为 active 的
  const firstActive = configs.find(c => c.isActive);
  if (firstActive) return firstActive;

  // 如果都没有，返回第一个
  return configs[0] || null;
}

// 添加新的 API 配置
export function addApiConfig(name, baseUrl, accessToken = '', userId = '', website = '') {
  const configs = getAllApiConfigs();

  // 验证并规范化 baseUrl 和 website
  const normalizedBaseUrl = validateAndNormalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    console.error('[utils] Invalid baseUrl:', baseUrl);
    return null;
  }

  const newConfig = {
    id: generateId(),
    name: name.trim(),
    baseUrl: normalizedBaseUrl,
    accessToken: accessToken.trim(),
    userId: userId.trim(),
    isActive: false,
    createdAt: Date.now(),
    lastUsedAt: null,
    website: validateAndNormalizeWebsite(website),
  };
  configs.push(newConfig);
  saveAllApiConfigs(configs);
  return newConfig;
}

// 更新 API 配置
export function updateApiConfig(id, updates) {
  const configs = getAllApiConfigs();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) return false;

  const normalizedUpdates = { ...updates };

  // 验证并规范化 baseUrl（如果提供）
  if (updates.baseUrl !== undefined) {
    const normalizedBaseUrl = validateAndNormalizeBaseUrl(updates.baseUrl);
    if (!normalizedBaseUrl) {
      console.error('[utils] Invalid baseUrl in update:', updates.baseUrl);
      return false;
    }
    normalizedUpdates.baseUrl = normalizedBaseUrl;
  }

  // 验证并规范化 website（如果提供）
  if (updates.website !== undefined) {
    normalizedUpdates.website = validateAndNormalizeWebsite(updates.website);
  }

  configs[index] = {
    ...configs[index],
    ...normalizedUpdates,
  };
  saveAllApiConfigs(configs);
  return true;
}

// 删除 API 配置
export function deleteApiConfig(id) {
  const configs = getAllApiConfigs();
  const filtered = configs.filter(c => c.id !== id);
  if (filtered.length === configs.length) return false; // 没有删除任何配置

  // 如果删除的是激活的配置，激活第一个
  const activeId = localStorage.getItem(CONFIG_KEYS.ACTIVE_API_ID);
  if (activeId === id && filtered.length > 0) {
    setActiveApiConfig(filtered[0].id);
  }

  saveAllApiConfigs(filtered);
  return true;
}

// 设置激活的 API 配置
export function setActiveApiConfig(id) {
  const configs = getAllApiConfigs();
  const target = configs.find(c => c.id === id);
  if (!target) return false;

  // 更新所有配置的 isActive 状态
  configs.forEach(c => {
    c.isActive = c.id === id;
    if (c.id === id) {
      c.lastUsedAt = Date.now();
    }
  });

  saveAllApiConfigs(configs);
  localStorage.setItem(CONFIG_KEYS.ACTIVE_API_ID, id);
  return true;
}

// 重新排序 API 配置（用于拖拽排序功能）
// 此函数不会改变激活状态，仅更新配置的顺序
export function reorderApiConfigs(orderedConfigs) {
  if (!Array.isArray(orderedConfigs) || orderedConfigs.length === 0) {
    return false;
  }
  saveAllApiConfigs(orderedConfigs);
  return true;
}

// ==================== 验证辅助函数 ====================

// 验证并规范化 website URL
function validateAndNormalizeWebsite(website) {
  if (!website) return '';
  const trimmed = website.trim();
  if (!trimmed) return '';

  // 只允许 http 和 https 协议
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }

  try {
    new URL(trimmed);
    return trimmed;
  } catch (e) {
    return '';
  }
}

// 验证并规范化 baseUrl
function validateAndNormalizeBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';

  // 移除尾部斜杠
  let normalized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

  // 强制使用 HTTPS
  if (!normalized.startsWith('https://')) {
    // 如果是 http，自动转换为 https
    if (normalized.startsWith('http://')) {
      normalized = 'https://' + normalized.slice(7);
    } else if (!normalized.startsWith('https://')) {
      return ''; // 无效的 URL
    }
  }

  // 验证是否为有效 URL
  try {
    new URL(normalized);
    return normalized;
  } catch (e) {
    return '';
  }
}

// ==================== 令牌配置管理 ====================
const TOKEN_CONFIG_KEYS = {
  TOKEN_CONFIGS: 'app_token_configs',
  ACTIVE_TOKEN_ID: 'app_active_token_id',
};

// 获取所有令牌配置
export function getAllTokenConfigs() {
  const configsJson = localStorage.getItem(TOKEN_CONFIG_KEYS.TOKEN_CONFIGS);

  if (!configsJson) {
    // 如果没有配置，创建空数组
    return [];
  }
  try {
    const configs = JSON.parse(configsJson);
    // 规范化和清洗旧数据
    const cleanedConfigs = configs.map(c => {
      // 清洗 baseUrl
      let cleanedBaseUrl = c.baseUrl || '';
      const normalizedBaseUrl = validateAndNormalizeBaseUrl(cleanedBaseUrl);
      if (!normalizedBaseUrl && cleanedBaseUrl) {
        console.warn('[utils] 清洗无效的 baseUrl:', cleanedBaseUrl);
      }

      // 清洗 website
      const cleanedWebsite = validateAndNormalizeWebsite(c.website || '');
      if (c.website && !cleanedWebsite) {
        console.warn('[utils] 清洗无效的 website:', c.website);
      }

      return {
        ...c,
        baseUrl: normalizedBaseUrl || cleanedBaseUrl, // 如果验证失败，保留原值以便用户修复
        website: cleanedWebsite
      };
    });

    // 如果有数据被清洗，更新存储
    const needsUpdate = cleanedConfigs.some((c, i) =>
      c.baseUrl !== configs[i].baseUrl || c.website !== configs[i].website
    );
    if (needsUpdate) {
      console.log('[utils] 检测到旧数据，已自动清洗并更新');
      saveAllTokenConfigs(cleanedConfigs);
    }

    return cleanedConfigs;
  } catch (e) {
    console.error('[utils] 解析令牌配置失败:', e);
    return [];
  }
}

// 保存所有令牌配置
export function saveAllTokenConfigs(configs) {
  localStorage.setItem(TOKEN_CONFIG_KEYS.TOKEN_CONFIGS, JSON.stringify(configs));
}

// 获取当前激活的令牌配置
export function getActiveTokenConfig() {
  const configs = getAllTokenConfigs();
  if (configs.length === 0) return null;

  const activeId = localStorage.getItem(TOKEN_CONFIG_KEYS.ACTIVE_TOKEN_ID);
  let active = configs.find(c => c.id === activeId);

  // 如果没有找到激活的，返回第一个
  if (!active && configs.length > 0) {
    active = configs[0];
  }

  return active;
}

// 添加新的令牌配置
export function addTokenConfig(name, baseUrl, apiKey, website = '') {
  const configs = getAllTokenConfigs();

  // 验证并规范化 baseUrl 和 website
  const normalizedBaseUrl = validateAndNormalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    console.error('[utils] Invalid baseUrl:', baseUrl);
    return null;
  }

  const newConfig = {
    id: generateId(),
    name: name.trim(),
    baseUrl: normalizedBaseUrl,
    apiKey: apiKey.trim(),
    isActive: configs.length === 0, // 如果是第一个，自动激活
    createdAt: Date.now(),
    lastUsedAt: null,
    website: validateAndNormalizeWebsite(website),
  };
  configs.push(newConfig);
  saveAllTokenConfigs(configs);

  // 如果是第一个，设置为激活
  if (configs.length === 1) {
    localStorage.setItem(TOKEN_CONFIG_KEYS.ACTIVE_TOKEN_ID, newConfig.id);
  }

  return newConfig;
}

// 更新令牌配置
export function updateTokenConfig(id, updates) {
  const configs = getAllTokenConfigs();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) return false;

  const normalizedUpdates = { ...updates };

  // 验证并规范化 baseUrl（如果提供）
  if (updates.baseUrl !== undefined) {
    const normalizedBaseUrl = validateAndNormalizeBaseUrl(updates.baseUrl);
    if (!normalizedBaseUrl) {
      console.error('[utils] Invalid baseUrl in update:', updates.baseUrl);
      return false;
    }
    normalizedUpdates.baseUrl = normalizedBaseUrl;
  }

  // 验证并规范化 website（如果提供）
  if (updates.website !== undefined) {
    normalizedUpdates.website = validateAndNormalizeWebsite(updates.website);
  }

  configs[index] = {
    ...configs[index],
    ...normalizedUpdates,
  };
  saveAllTokenConfigs(configs);
  return true;
}

// 删除令牌配置
export function deleteTokenConfig(id) {
  const configs = getAllTokenConfigs();
  const filtered = configs.filter(c => c.id !== id);
  if (filtered.length === configs.length) return false;

  // 如果删除的是激活的配置，激活第一个
  const activeId = localStorage.getItem(TOKEN_CONFIG_KEYS.ACTIVE_TOKEN_ID);
  if (activeId === id && filtered.length > 0) {
    setActiveTokenConfig(filtered[0].id);
  }

  saveAllTokenConfigs(filtered);
  return true;
}

// 设置激活的令牌配置
export function setActiveTokenConfig(id) {
  const configs = getAllTokenConfigs();
  const target = configs.find(c => c.id === id);
  if (!target) return false;

  // 更新所有配置的 isActive 状态
  configs.forEach(c => {
    c.isActive = c.id === id;
    if (c.id === id) {
      c.lastUsedAt = Date.now();
    }
  });

  saveAllTokenConfigs(configs);
  localStorage.setItem(TOKEN_CONFIG_KEYS.ACTIVE_TOKEN_ID, id);
  return true;
}

// 重新排序令牌配置（用于拖拽排序功能）
// 此函数不会改变激活状态，仅更新配置的顺序
export function reorderTokenConfigs(orderedConfigs) {
  if (!Array.isArray(orderedConfigs) || orderedConfigs.length === 0) {
    return false;
  }
  saveAllTokenConfigs(orderedConfigs);
  return true;
}

// ==================== API 错误解析工具 ====================

/**
 * 解析 API 错误响应，提取错误信息并判断是否为额度耗尽错误
 *
 * @param {Error} error - 错误对象（通常来自 axios 或 fetch）
 * @returns {{ message: string, quotaDepleted: boolean }} 解析结果
 *
 * @example
 * // 新格式（嵌套的 error 对象）
 * const error1 = {
 *   response: {
 *     data: {
 *       error: {
 *         message: "[sk-xxx] 该令牌额度已用尽 RemainQuota = -17453",
 *         code: "",
 *         type: "new_api_error"
 *       }
 *     }
 *   }
 * };
 * parseApiError(error1) // => { message: "[sk-xxx] 该令牌额度已用尽...", quotaDepleted: true }
 *
 * // 旧格式（直接的 message 字段）
 * const error2 = {
 *   response: {
 *     data: { message: "Invalid API key" },
 *     status: 401
 *   }
 * };
 * parseApiError(error2) // => { message: "Invalid API key", quotaDepleted: false }
 */
export function parseApiError(error) {
  let message = '未知错误';
  let quotaDepleted = false;

  // 按优先级提取错误信息
  if (error.response) {
    const responseData = error.response.data;

    // 1. 优先尝试嵌套的 error.message（新格式）
    if (responseData?.error?.message) {
      message = responseData.error.message;
    }
    // 2. 然后尝试直接的 message 字段（旧格式）
    else if (responseData?.message) {
      message = responseData.message;
    }
    // 3. 如果 data 本身是字符串
    else if (typeof responseData === 'string' && responseData.trim()) {
      message = responseData.trim();
    }
    // 4. 使用 HTTP 状态文本
    else if (error.response.statusText) {
      message = `服务器错误 (${error.response.status}): ${error.response.statusText}`;
    }
    // 5. 只有状态码
    else if (error.response.status) {
      message = `服务器错误 (${error.response.status})`;
    }
    // 6. 如果以上都为空，尝试使用 error.message
    else if (error.message) {
      message = error.message;
    }
  }
  // 网络错误（请求发送但没有响应）
  else if (error.request) {
    message = '无法连接到服务器，请检查网络';
  }
  // 其他错误
  else if (error.message) {
    message = error.message;
  }

  // 规范化 message 为字符串（防止非字符串导致后续操作崩溃）
  const normalizedMessage = typeof message === 'string' ? message : String(message || '未知错误');

  // 检测是否为额度耗尽错误
  // 1. 检查关键词
  const quotaKeywords = [
    '额度已用尽',
    '额度不足',
    'out of quota',
    'quota exceeded',
    'insufficient quota',
    'quota exhausted',
    'no quota',
    'balance insufficient',
    'insufficient balance',
  ];

  const lowerMessage = normalizedMessage.toLowerCase();
  const hasQuotaKeyword = quotaKeywords.some(keyword =>
    lowerMessage.includes(keyword.toLowerCase())
  );

  // 2. 检查 RemainQuota 是否为负数（支持 = 和 : 分隔符）
  const remainQuotaMatch = normalizedMessage.match(/RemainQuota\s*[:=]?\s*(-?\d+)/i);
  const hasNegativeQuota = remainQuotaMatch && parseInt(remainQuotaMatch[1]) < 0;

  quotaDepleted = hasQuotaKeyword || hasNegativeQuota;

  return {
    message: normalizedMessage,
    quotaDepleted
  };
}

// ==================== 分享功能工具函数 ====================

/**
 * 脱敏API Key，显示前3位和后4位，中间用*替代
 * @param {string} apiKey - 原始API Key
 * @returns {string} 脱敏后的API Key
 */
export function maskApiKey(apiKey = '') {
  if (!apiKey) return '';
  // 对于长度小于等于7的key，完全脱敏（只保留首尾各1字符，其余全部mask）
  if (apiKey.length <= 7) {
    return '*'.repeat(apiKey.length);
  }
  const head = apiKey.slice(0, 3);
  const tail = apiKey.slice(-4);
  return `${head}${'*'.repeat(Math.min(apiKey.length - 7, 20))}${tail}`;
}

/**
 * 编码分享数据为URL安全字符串（轻量版：只包含配置信息，打开后实时查询）
 * @param {Object} tokenData - 令牌配置数据
 * @returns {string} 编码后的字符串
 */
export function encodeShareData(tokenData = {}) {
  try {
    const payload = {
      v: 2, // 版本号，用于区分新旧格式
      n: tokenData.name || '',
      b: tokenData.baseUrl || '',
      k: tokenData.apiKey || '', // 完整 API Key，用于实时查询
      w: tokenData.website || '',
    };
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
  } catch (err) {
    console.error('[Share] encodeShareData failed:', err);
    return '';
  }
}

/**
 * 解码分享数据
 * @param {string} shareParam - URL参数中的分享数据
 * @returns {Object|null} 解码后的分享数据，失败返回null
 */
export function decodeShareData(shareParam = '') {
  try {
    if (!shareParam) return null;
    const json = decodeURIComponent(escape(atob(decodeURIComponent(shareParam))));
    const data = JSON.parse(json);

    // 新格式 v2：轻量级，只包含配置信息
    if (data.v === 2) {
      return {
        version: 2,
        token: {
          name: data.n || '',
          baseUrl: data.b || '',
          apiKey: data.k || '',
          website: data.w || '',
        },
      };
    }

    // 旧格式兼容：包含完整的 token、queryData、logs
    if (data.token && typeof data.token === 'object') {
      return {
        version: 1,
        ...data,
      };
    }

    console.error('[Share] Invalid share data structure');
    return null;
  } catch (err) {
    console.error('[Share] decodeShareData failed:', err);
    return null;
  }
}

/**
 * 生成完整的分享URL（轻量版：只包含配置信息）
 * @param {Object} tokenData - 令牌配置数据
 * @returns {string} 完整的分享URL
 */
export function generateShareUrl(tokenData = {}) {
  const encoded = encodeShareData(tokenData);
  if (!encoded) return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?share=${encoded}`;
}