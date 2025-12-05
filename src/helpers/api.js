import axios from 'axios';

export const API = axios.create({
  baseURL: process.env.REACT_APP_SERVER ? process.env.REACT_APP_SERVER : '',
});

// 移除全局错误拦截器，让各组件自行处理错误
// 这样可以避免重复显示错误提示，并允许组件根据业务逻辑自定义错误信息
// 例如：额度耗尽、网络错误等不同场景需要不同的提示
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // 直接返回 rejected promise，让调用方的 catch 处理
    return Promise.reject(error);
  }
);
