import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Modal, Form, Toast, Space, Typography, Empty, Spin, Switch, InputNumber } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete, IconRefresh, IconUpload, IconDownload } from '@douyinfe/semi-icons';
import { API } from '../helpers';
import {
    getAllApiConfigs,
    addApiConfig,
    updateApiConfig,
    deleteApiConfig
} from '../helpers/utils';

const { Text, Title } = Typography;

const ApiConfigManager = () => {
    const [apiConfigs, setApiConfigs] = useState([]);
    const [quotaData, setQuotaData] = useState({}); // { apiId: { planName, remaining, used, total, loading } }

    // 添加/编辑对话框
    const [apiFormVisible, setApiFormVisible] = useState(false);
    const [editingApi, setEditingApi] = useState(null);
    const [apiFormApi, setApiFormApi] = useState(null);

    // 自动查询相关状态
    const [autoRefresh, setAutoRefresh] = useState(() => {
        const saved = localStorage.getItem('api_auto_refresh');
        return saved === 'true';
    });
    const [refreshInterval, setRefreshInterval] = useState(() => {
        const saved = localStorage.getItem('api_refresh_interval');
        return saved ? parseInt(saved) : 10;
    });
    const timerRef = useRef(null);

    useEffect(() => {
        loadConfigs();
    }, []);

    // 当编辑对话框打开时，重新设置表单值
    useEffect(() => {
        if (apiFormVisible && apiFormApi) {
            if (editingApi) {
                apiFormApi.setValues({
                    name: editingApi.name,
                    baseUrl: editingApi.baseUrl,
                    accessToken: editingApi.accessToken || '',
                    userId: editingApi.userId || ''
                });
            } else {
                apiFormApi.setValues({ name: '', baseUrl: '', accessToken: '', userId: '' });
            }
        }
    }, [apiFormVisible, editingApi, apiFormApi]);

    const loadConfigs = () => {
        const configs = getAllApiConfigs();
        setApiConfigs(configs);
    };

    // 查询 API 额度
    // silent: 静默模式，不显示成功Toast(用于批量自动查询)
    const fetchQuota = async (api, silent = false) => {
        if (!api.accessToken || !api.userId) {
            if (!silent) {
                Toast.warning('请先配置访问令牌和用户ID');
            }
            return { success: false };
        }

        // 设置加载状态
        setQuotaData(prev => ({
            ...prev,
            [api.id]: { ...prev[api.id], loading: true }
        }));

        try {
            // 通过Vercel云函数代理请求，避免CORS问题
            // X-Target-BaseUrl头告诉云函数要转发到哪个API服务器
            console.log('[ApiConfigManager] 通过云函数代理请求到:', api.baseUrl);

            const res = await API.get('/api/proxy/api/user/self', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.accessToken}`,
                    'New-Api-User': api.userId,
                    'X-Target-BaseUrl': api.baseUrl  // 云函数根据这个头转发请求
                }
            });

            console.log('[ApiConfigManager] 请求成功:', res.data);
            const { success, data } = res.data;
            if (success && data) {
                const quota = {
                    planName: data.group || '默认套餐',
                    remaining: data.quota / 500000,
                    used: data.used_quota / 500000,
                    total: (data.quota + data.used_quota) / 500000,
                    loading: false
                };
                setQuotaData(prev => ({ ...prev, [api.id]: quota }));
                if (!silent) {
                    Toast.success('额度查询成功');
                }
                return { success: true };
            } else {
                setQuotaData(prev => ({ ...prev, [api.id]: { loading: false } }));
                if (!silent) {
                    Toast.error('查询失败：' + (res.data.message || '未知错误'));
                }
                return { success: false };
            }
        } catch (error) {
            console.error('[ApiConfigManager] 请求失败:', error);
            setQuotaData(prev => ({ ...prev, [api.id]: { loading: false } }));

            // 详细的错误信息
            let errorMsg = '网络错误';
            if (error.response) {
                // 服务器返回了错误响应
                errorMsg = error.response.data?.message || `服务器错误 (${error.response.status})`;
                console.error('[ApiConfigManager] 服务器响应:', error.response.data);
            } else if (error.request) {
                // 请求已发送但没有收到响应（可能是CORS或网络问题）
                errorMsg = '无法连接到服务器，请检查网络或API地址是否正确';
                console.error('[ApiConfigManager] 无响应:', error.request);
            } else {
                // 其他错误
                errorMsg = error.message || '未知错误';
            }
            if (!silent) {
                Toast.error('查询失败：' + errorMsg);
            }
            return { success: false };
        }
    };

    // 记录是否已执行过首次自动查询
    const hasInitialFetchedRef = useRef(false);

    // 自动查询所有有凭证的API
    const autoFetchAllQuotas = useCallback(async () => {
        console.log('[ApiConfigManager] 执行自动查询');
        const validApis = apiConfigs.filter(api => api.accessToken && api.userId);

        if (validApis.length === 0) {
            return;
        }

        // 批量查询，使用静默模式
        const results = await Promise.all(
            validApis.map(api => fetchQuota(api, true))
        );

        // 统计成功和失败数量
        const successCount = results.filter(r => r?.success).length;
        const failCount = results.length - successCount;

        // 显示汇总Toast
        if (successCount > 0 && failCount === 0) {
            Toast.success(`查询成功 x${successCount}`);
        } else if (successCount > 0 && failCount > 0) {
            Toast.warning(`查询完成：成功 x${successCount}，失败 x${failCount}`);
        } else if (failCount > 0) {
            Toast.error(`查询失败 x${failCount}`);
        }
    }, [apiConfigs]);

    // 页面加载时自动查询一次(刷新网页时触发)
    useEffect(() => {
        // 只在第一次有API配置时执行一次
        if (apiConfigs.length > 0 && !hasInitialFetchedRef.current) {
            console.log('[ApiConfigManager] 页面加载,自动查询所有API额度');
            hasInitialFetchedRef.current = true;
            autoFetchAllQuotas();
        }
    }, [apiConfigs, autoFetchAllQuotas]);

    // 自动查询定时器逻辑
    useEffect(() => {
        // 清除旧定时器
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // 如果开启自动查询
        if (autoRefresh && refreshInterval > 0 && apiConfigs.length > 0) {
            console.log(`[ApiConfigManager] 启动自动查询，间隔${refreshInterval}秒`);
            // 立即执行一次
            autoFetchAllQuotas();
            // 设置定时器
            timerRef.current = setInterval(() => {
                autoFetchAllQuotas();
            }, refreshInterval * 1000);
        }

        // 组件卸载时清除定时器
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [autoRefresh, refreshInterval, apiConfigs, autoFetchAllQuotas]);

    // 切换自动查询开关
    const handleAutoRefreshChange = (checked) => {
        setAutoRefresh(checked);
        localStorage.setItem('api_auto_refresh', checked.toString());
        if (checked) {
            Toast.success(`已开启自动查询，间隔${refreshInterval}秒`);
        } else {
            Toast.info('已关闭自动查询');
        }
    };

    // 修改查询间隔
    const handleIntervalChange = (value) => {
        if (value && value >= 5 && value <= 300) {
            setRefreshInterval(value);
            localStorage.setItem('api_refresh_interval', value.toString());
        }
    };

    // 打开添加对话框
    const handleAddApi = () => {
        setEditingApi(null);
        setApiFormVisible(true);
    };

    // 打开编辑对话框
    const handleEditApi = (api) => {
        setEditingApi(api);
        setApiFormVisible(true);
    };

    // 保存 API
    const handleSaveApi = () => {
        if (!apiFormApi) {
            Toast.error('表单未初始化');
            return;
        }

        apiFormApi.validate().then((values) => {
            const { name, baseUrl, accessToken, userId } = values;

            if (editingApi) {
                // 编辑现有 API
                const success = updateApiConfig(editingApi.id, {
                    name,
                    baseUrl,
                    accessToken: accessToken || '',
                    userId: userId || ''
                });
                if (success) {
                    Toast.success('API 配置已更新');
                    loadConfigs();
                    setApiFormVisible(false);
                } else {
                    Toast.error('更新失败：无法找到该 API 配置');
                }
            } else {
                // 添加新 API
                const newApi = addApiConfig(name, baseUrl, accessToken || '', userId || '');
                if (newApi) {
                    Toast.success('API 配置已添加');
                    loadConfigs();
                    setApiFormVisible(false);
                } else {
                    Toast.error('添加失败');
                }
            }
        }).catch((errors) => {
            Toast.error('请检查表单输入');
        });
    };

    // 删除 API
    const handleDeleteApi = (api) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除 API "${api.name}" 吗？`,
            onOk: () => {
                const success = deleteApiConfig(api.id);
                if (success) {
                    Toast.success('API 配置已删除');
                    loadConfigs();
                } else {
                    Toast.error('删除失败');
                }
            },
        });
    };

    // 导出配置
    const handleExport = () => {
        const configs = getAllApiConfigs();
        if (configs.length === 0) {
            Toast.warning('暂无配置可导出');
            return;
        }

        // 导出时移除敏感信息（id、createdAt、lastUsedAt、isActive），只保留核心配置
        const exportData = configs.map(({ name, baseUrl, accessToken, userId }) => ({
            name,
            baseUrl,
            accessToken,
            userId
        }));

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-configs-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Toast.success(`已导出 ${configs.length} 个API配置`);
    };

    // 导入配置
    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importData = JSON.parse(event.target.result);

                    if (!Array.isArray(importData)) {
                        Toast.error('文件格式错误：应为配置数组');
                        return;
                    }

                    let successCount = 0;
                    let failCount = 0;

                    importData.forEach((config) => {
                        const { name, baseUrl, accessToken, userId } = config;
                        if (!name || !baseUrl) {
                            failCount++;
                            return;
                        }

                        const result = addApiConfig(name, baseUrl, accessToken || '', userId || '');
                        if (result) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    });

                    loadConfigs();

                    if (successCount > 0 && failCount === 0) {
                        Toast.success(`成功导入 ${successCount} 个配置`);
                    } else if (successCount > 0 && failCount > 0) {
                        Toast.warning(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`);
                    } else {
                        Toast.error(`导入失败：${failCount} 个配置无效`);
                    }
                } catch (error) {
                    console.error('[ApiConfigManager] 导入失败:', error);
                    Toast.error('文件解析失败，请检查JSON格式');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // 渲染 API 卡片
    const renderApiCard = (api) => {
        const hasCredentials = api.accessToken && api.userId;
        const quota = quotaData[api.id];
        const lastUsed = api.lastUsedAt
            ? (() => {
                const now = Date.now();
                const diff = Math.floor((now - api.lastUsedAt) / 1000 / 60);
                if (diff < 1) return '刚刚';
                if (diff < 60) return `${diff} 分钟前`;
                const hours = Math.floor(diff / 60);
                if (hours < 24) return `${hours} 小时前`;
                const days = Math.floor(hours / 24);
                return `${days} 天前`;
              })()
            : '从未使用';

        return (
            <Card
                key={api.id}
                style={{
                    marginBottom: 12,
                    border: '1px solid #e8e8e8',
                    borderRadius: 6,
                    background: 'white',
                    transition: 'all 0.3s',
                }}
                bodyStyle={{ padding: '12px 16px' }}
            >
                <Spin spinning={quota?.loading || false}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            {/* 名称 */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                                <Title heading={6} style={{ margin: 0, fontSize: 15 }}>
                                    {api.name}
                                </Title>
                            </div>

                            {/* URL */}
                            <Text type="tertiary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                {api.baseUrl}
                            </Text>

                            {/* 额度信息 */}
                            {quota && !quota.loading && quota.total && (
                                <div style={{
                                    marginTop: 8,
                                    marginBottom: 4,
                                    padding: '6px 8px',
                                    background: '#f7f8fa',
                                    borderRadius: 4,
                                    fontSize: 11
                                }}>
                                    <Text style={{ fontSize: 11, marginRight: 12 }}>
                                        已使用：<Text strong>${quota.used.toFixed(3)}</Text>
                                    </Text>
                                    <Text style={{ fontSize: 11 }}>
                                        剩余：<Text strong style={{ color: '#52c41a' }}>${quota.remaining.toFixed(3)}</Text>
                                    </Text>
                                </div>
                            )}

                            {/* 最后使用时间 */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <IconRefresh style={{ marginRight: 4, fontSize: 12, color: '#999' }} />
                                <Text type="tertiary" style={{ fontSize: 11 }}>
                                    {lastUsed}
                                </Text>
                            </div>
                        </div>

                        {/* 右侧按钮区 */}
                        <Space spacing={4}>
                            {hasCredentials && (
                                <Button
                                    theme="light"
                                    type="primary"
                                    icon={<IconRefresh />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fetchQuota(api);
                                    }}
                                    size="small"
                                >
                                    查询
                                </Button>
                            )}
                            <Button
                                theme="borderless"
                                icon={<IconEdit />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditApi(api);
                                }}
                                size="small"
                            />
                            <Button
                                theme="borderless"
                                type="danger"
                                icon={<IconDelete />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteApi(api);
                                }}
                                size="small"
                                disabled={apiConfigs.length === 1}
                            />
                        </Space>
                    </div>
                </Spin>
            </Card>
        );
    };

    return (
        <div>
            {/* 顶部控制区 */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* 左侧：自动查询控制 */}
                <Space>
                    <Switch
                        checked={autoRefresh}
                        onChange={handleAutoRefreshChange}
                        size="default"
                    />
                    <Text type="secondary" style={{ fontSize: 14 }}>自动查询</Text>
                    {autoRefresh && (
                        <>
                            <InputNumber
                                value={refreshInterval}
                                onChange={handleIntervalChange}
                                min={5}
                                max={300}
                                step={5}
                                suffix="秒"
                                style={{ width: 100 }}
                                size="small"
                            />
                        </>
                    )}
                </Space>

                {/* 右侧：操作按钮组 */}
                <Space>
                    <Button
                        icon={<IconUpload />}
                        onClick={handleImport}
                        size="default"
                    >
                        导入
                    </Button>
                    <Button
                        icon={<IconDownload />}
                        onClick={handleExport}
                        size="default"
                        disabled={apiConfigs.length === 0}
                    >
                        导出
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        onClick={handleAddApi}
                        type="primary"
                        size="default"
                    >
                        添加 API
                    </Button>
                </Space>
            </div>

            {/* API 列表 */}
            {apiConfigs.length === 0 ? (
                <Empty
                    image={<IconRefresh style={{ fontSize: 48, color: '#ccc' }} />}
                    title="暂无 API 配置"
                    description='点击上方"添加 API"按钮开始配置'
                    style={{ padding: 60 }}
                />
            ) : (
                <div>
                    {apiConfigs.map(renderApiCard)}
                </div>
            )}

            {/* 添加/编辑对话框 */}
            <Modal
                title={editingApi ? '编辑 API' : '添加 API'}
                visible={apiFormVisible}
                onCancel={() => setApiFormVisible(false)}
                onOk={handleSaveApi}
                okText="保存"
                cancelText="取消"
                width={520}
            >
                <Form
                    getFormApi={(api) => setApiFormApi(api)}
                    labelPosition="top"
                    initValues={
                        editingApi
                            ? {
                                name: editingApi.name,
                                baseUrl: editingApi.baseUrl,
                                accessToken: editingApi.accessToken || '',
                                userId: editingApi.userId || ''
                              }
                            : { name: '', baseUrl: '', accessToken: '', userId: '' }
                    }
                >
                    <Form.Input
                        field="name"
                        label="名称"
                        placeholder="例如：ikuncode"
                        rules={[{ required: true, message: '名称不能为空' }]}
                        style={{ marginBottom: 12 }}
                    />
                    <Form.Input
                        field="baseUrl"
                        label="Base URL"
                        placeholder="https://api.ikuncode.cc"
                        rules={[
                            { required: true, message: 'Base URL 不能为空' },
                            {
                                validator: (rule, value) => {
                                    if (!value) return true;

                                    // 检查是否以斜杠结尾
                                    if (value.endsWith('/')) {
                                        return '结尾不要带 /';
                                    }

                                    // 强制要求使用HTTPS,避免重定向导致CORS错误
                                    if (!value.startsWith('https://')) {
                                        if (value.startsWith('http://')) {
                                            return '必须使用 HTTPS 协议(http:// 会导致重定向和CORS错误)';
                                        }
                                        return '必须以 https:// 开头';
                                    }

                                    return true;
                                }
                            }
                        ]}
                        extraText="必须使用 HTTPS 协议,结尾不要带 /"
                        style={{ marginBottom: 12 }}
                    />
                    <Form.Input
                        field="accessToken"
                        label="访问令牌"
                        placeholder="可选"
                        mode="password"
                        style={{ marginBottom: 12 }}
                    />
                    <Form.Input
                        field="userId"
                        label="用户 ID"
                        placeholder="可选"
                        style={{ marginBottom: 0 }}
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default ApiConfigManager;
