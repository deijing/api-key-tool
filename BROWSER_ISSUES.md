# 浏览器缓存问题解决方案

## 常见问题：MIME 类型错误

如果您在浏览器中看到以下错误：
```
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "text/html"
```

## 快速解决方法

### 方法1: 硬刷新（最快）
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

### 方法2: 清空缓存
1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方法3: 使用隐私窗口
- **Chrome/Edge**: `Cmd/Ctrl + Shift + N`
- **Firefox**: `Cmd/Ctrl + Shift + P`
- **Safari**: `Cmd + Shift + N`

### 方法4: 清理缓存并重启（彻底）
```bash
# 停止服务器（Ctrl+C）
npm run clean
npm start
```

或者使用新增的快捷命令：
```bash
npm run fresh
```

## 预防措施

### 1. 开发时禁用缓存
打开浏览器开发者工具（F12）：
1. 切换到 Network（网络）标签页
2. 勾选 "Disable cache"（禁用缓存）
3. 保持开发者工具打开状态

### 2. 使用正确的访问地址
确保访问的是正确的开发服务器地址：
- 默认: http://localhost:3000
- 如果端口被占用: http://localhost:3001

### 3. 定期清理构建缓存
```bash
# 清理缓存
npm run clean

# 或者删除整个 node_modules 和 package-lock.json 重新安装
rm -rf node_modules package-lock.json
npm install
```

## 为什么会出现这个问题？

1. **浏览器缓存**: 浏览器缓存了旧版本的资源
2. **Service Worker**: 如果项目使用了 Service Worker，可能会缓存旧的资源
3. **Webpack Dev Server**: 开发服务器的缓存机制
4. **端口冲突**: 访问了错误的端口或旧的服务器实例

## 开发最佳实践

1. **始终在开发者工具中禁用缓存**
2. **使用隐私窗口测试**
3. **遇到问题先硬刷新**
4. **定期清理缓存和构建文件**
5. **确保每次只运行一个开发服务器实例**
