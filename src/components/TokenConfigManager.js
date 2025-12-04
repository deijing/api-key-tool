import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Button, Modal, Form, Toast, Space, Typography, Empty, Spin, Switch, InputNumber, Collapse, Table, Tag } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete, IconRefresh, IconEyeOpened, IconDownload, IconUpload, IconHandle } from '@douyinfe/semi-icons';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API } from '../helpers';
import {
    getAllTokenConfigs,
    addTokenConfig,
    updateTokenConfig,
    deleteTokenConfig,
    reorderTokenConfigs
} from '../helpers/utils';
import { timestamp2string } from '../helpers';
import { ITEMS_PER_PAGE } from '../constants';

const { Text, Title } = Typography;
const { Panel } = Collapse;

const TokenConfigManager = () => {
    const [tokenConfigs, setTokenConfigs] = useState([]);
    const tokenConfigsRef = useRef([]);
    const [queryData, setQueryData] = useState({}); // { tokenId: { balance, usage, accessdate, valid, loading } }

    // 详情Modal相关状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailToken, setDetailToken] = useState(null);
    const [detailLogs, setDetailLogs] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailActiveKeys, setDetailActiveKeys] = useState(['1', '2']);

    // 添加/编辑对话框
    const [formVisible, setFormVisible] = useState(false);
    const [editingToken, setEditingToken] = useState(null);
    const [formApi, setFormApi] = useState(null);

    // 自动查询相关状态
    const [autoRefresh, setAutoRefresh] = useState(() => {
        const saved = localStorage.getItem('token_auto_refresh');
        return saved === 'true';
    });
    const [refreshInterval, setRefreshInterval] = useState(() => {
        const saved = localStorage.getItem('token_refresh_interval');
        return saved ? parseInt(saved) : 10;
    });
    const timerRef = useRef(null);

    // 使用内容哈希来判断配置是否真正变化（忽略顺序变化）
    const autoFetchKey = useMemo(
        () => tokenConfigs
            .map(token => `${token.id}:${token.baseUrl}:${token.apiKey}`)
            .sort()
            .join('|'),
        [tokenConfigs]
    );

    // 配置拖拽传感器，触发距离设为 8 像素以避免误触发
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        })
    );

    useEffect(() => {
        loadConfigs();
    }, []);

    // 同步配置到 ref，供自动查询使用
    useEffect(() => {
        tokenConfigsRef.current = tokenConfigs;
    }, [tokenConfigs]);

    // 当编辑对话框打开时，重新设置表单值
    useEffect(() => {
        if (formVisible && formApi) {
            if (editingToken) {
                formApi.setValues({
                    name: editingToken.name,
                    baseUrl: editingToken.baseUrl,
                    apiKey: editingToken.apiKey || ''
                });
            } else {
                formApi.setValues({ name: '', baseUrl: '', apiKey: '' });
            }
        }
    }, [formVisible, editingToken, formApi]);

    const loadConfigs = () => {
        const configs = getAllTokenConfigs();
        setTokenConfigs(configs);
    };

    // 处理拖拽结束事件
    const handleDragEnd = (event) => {
        const { active, over } = event;

        // 如果没有有效的目标位置，或者位置没有变化，直接返回
        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = tokenConfigs.findIndex(item => item.id === active.id);
        const newIndex = tokenConfigs.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // 使用 arrayMove 重新排列数组
        const reorderedConfigs = arrayMove(tokenConfigs, oldIndex, newIndex);

        // 更新状态
        setTokenConfigs(reorderedConfigs);

        // 持久化到 localStorage
        reorderTokenConfigs(reorderedConfigs);
    };

    // 查询令牌信息
    // silent: 静默模式，不显示成功Toast(用于批量自动查询)
    const fetchTokenInfo = async (token, silent = false) => {
        if (!token.apiKey) {
            if (!silent) {
                Toast.warning('请先配置API Key');
            }
            return { success: false };
        }

        // 设置加载状态
        setQueryData(prev => ({
            ...prev,
            [token.id]: { ...prev[token.id], loading: true }
        }));

        try {
            console.log('[TokenConfigManager] 通过云函数代理查询令牌:', token.baseUrl);

            // 查询订阅信息
            const subscription = await API.get('/api/proxy/v1/dashboard/billing/subscription', {
                headers: {
                    'Authorization': `Bearer ${token.apiKey}`,
                    'X-Target-BaseUrl': token.baseUrl
                },
            });
            const subscriptionData = subscription.data;
            const balance = subscriptionData.hard_limit_usd;

            // 查询使用量
            let now = new Date();
            let start = new Date(now.getTime() - 100 * 24 * 3600 * 1000);
            let start_date = start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate();
            let end_date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
            const usageRes = await API.get(`/api/proxy/v1/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`, {
                headers: {
                    'Authorization': `Bearer ${token.apiKey}`,
                    'X-Target-BaseUrl': token.baseUrl
                },
            });
            const usage = usageRes.data.total_usage / 100;

            setQueryData(prev => ({
                ...prev,
                [token.id]: {
                    balance,
                    usage,
                    accessdate: 0, // OpenAI API 没有过期时间
                    valid: true,
                    loading: false
                }
            }));
            if (!silent) {
                Toast.success('查询成功');
            }
            return { success: true };
        } catch (error) {
            console.error('[TokenConfigManager] 查询失败:', error);
            setQueryData(prev => ({
                ...prev,
                [token.id]: { loading: false, valid: false }
            }));

            let errorMsg = '查询失败';
            if (error.response) {
                errorMsg = `查询失败：${error.response.data?.message || error.response.statusText || '服务器错误'}`;
            } else if (error.request) {
                errorMsg = '查询失败：无法连接到服务器，请检查网络';
            } else {
                errorMsg = `查询失败：${error.message || '未知错误'}`;
            }
            if (!silent) {
                Toast.error(errorMsg);
            }
            return { success: false };
        }
    };

    // 记录是否已执行过首次自动查询
    const hasInitialFetchedRef = useRef(false);

    // 自动查询所有有API Key的令牌
    const autoFetchAllTokens = useCallback(async () => {
        console.log('[TokenConfigManager] 执行自动查询');
        const validTokens = tokenConfigsRef.current.filter(token => token.apiKey);

        if (validTokens.length === 0) {
            return;
        }

        // 批量查询，使用静默模式
        const results = await Promise.all(
            validTokens.map(token => fetchTokenInfo(token, true))
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
    }, []);

    // 页面加载时自动查询一次(刷新网页时触发)
    useEffect(() => {
        // 只在第一次有令牌配置时执行一次
        if (tokenConfigs.length > 0 && !hasInitialFetchedRef.current) {
            console.log('[TokenConfigManager] 页面加载，自动查询所有令牌');
            hasInitialFetchedRef.current = true;
            autoFetchAllTokens();
        }
    }, [tokenConfigs.length, autoFetchAllTokens]);

    // 自动查询定时器逻辑
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (autoRefresh && refreshInterval > 0 && tokenConfigs.length > 0) {
            console.log(`[TokenConfigManager] 启动自动查询，间隔${refreshInterval}秒`);
            autoFetchAllTokens();
            timerRef.current = setInterval(() => {
                autoFetchAllTokens();
            }, refreshInterval * 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [autoRefresh, refreshInterval, tokenConfigs.length, autoFetchAllTokens, autoFetchKey]);

    // 切换自动查询开关
    const handleAutoRefreshChange = (checked) => {
        setAutoRefresh(checked);
        localStorage.setItem('token_auto_refresh', checked.toString());
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
            localStorage.setItem('token_refresh_interval', value.toString());
        }
    };

    // 打开添加对话框
    const handleAdd = () => {
        setEditingToken(null);
        setFormVisible(true);
    };

    // 打开编辑对话框
    const handleEdit = (token) => {
        setEditingToken(token);
        setFormVisible(true);
    };

    // 保存令牌
    const handleSave = () => {
        if (!formApi) {
            Toast.error('表单未初始化');
            return;
        }

        formApi.validate().then((values) => {
            const { name, baseUrl, apiKey } = values;

            if (editingToken) {
                const success = updateTokenConfig(editingToken.id, {
                    name,
                    baseUrl,
                    apiKey: apiKey || ''
                });
                if (success) {
                    Toast.success('令牌配置已更新');
                    loadConfigs();
                    setFormVisible(false);
                } else {
                    Toast.error('更新失败');
                }
            } else {
                const newToken = addTokenConfig(name, baseUrl, apiKey || '');
                if (newToken) {
                    Toast.success('令牌配置已添加');
                    loadConfigs();
                    setFormVisible(false);
                } else {
                    Toast.error('添加失败');
                }
            }
        }).catch(() => {
            Toast.error('请检查表单输入');
        });
    };

    // 删除令牌
    const handleDelete = (token) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除令牌 "${token.name}" 吗？`,
            onOk: () => {
                const success = deleteTokenConfig(token.id);
                if (success) {
                    Toast.success('令牌配置已删除');
                    loadConfigs();
                } else {
                    Toast.error('删除失败');
                }
            },
        });
    };

    // 导出配置
    const handleExport = () => {
        const configs = getAllTokenConfigs();
        if (configs.length === 0) {
            Toast.warning('暂无配置可导出');
            return;
        }

        // 导出时移除敏感信息（id、lastUsedAt），只保留核心配置
        const exportData = configs.map(({ name, baseUrl, apiKey }) => ({
            name,
            baseUrl,
            apiKey
        }));

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `token-configs-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Toast.success(`已导出 ${configs.length} 个令牌配置`);
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
                        const { name, baseUrl, apiKey } = config;
                        if (!name || !baseUrl) {
                            failCount++;
                            return;
                        }

                        const result = addTokenConfig(name, baseUrl, apiKey || '');
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
                    console.error('[TokenConfigManager] 导入失败:', error);
                    Toast.error('文件解析失败，请检查JSON格式');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // 查看详情
    const handleViewDetail = async (token) => {
        setDetailToken(token);
        setDetailVisible(true);
        setDetailLogs([]);

        // 如果已经有查询数据，直接使用；否则先查询
        const existingData = queryData[token.id];
        if (!existingData || !existingData.valid) {
            await fetchTokenInfo(token, true);
        }

        // 获取使用明细
        await fetchTokenDetails(token);
    };

    // 获取令牌使用明细
    const fetchTokenDetails = async (token) => {
        if (!token.apiKey) {
            return;
        }

        setDetailLoading(true);
        try {
            // 查询使用详情（这个接口可能不是所有服务商都支持）
            // 如果是OpenAI官方API，可能没有详细日志接口
            // 这里先留空，或者尝试调用
            console.log('[TokenConfigManager] 获取使用明细:', token.baseUrl);

            // 尝试调用日志接口（如果服务商支持）
            try {
                const logRes = await API.get(`/api/proxy/api/log/token?key=${token.apiKey}`, {
                    headers: {
                        'X-Target-BaseUrl': token.baseUrl
                    }
                });
                const { success, data } = logRes.data;
                if (success && data) {
                    setDetailLogs(data.reverse());
                } else {
                    setDetailLogs([]);
                }
            } catch (err) {
                // 如果接口不存在或不支持，不显示错误
                console.log('[TokenConfigManager] 该服务商不支持使用明细查询');
                setDetailLogs([]);
            }
        } catch (error) {
            console.error('[TokenConfigManager] 获取使用明细失败:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    // 可排序的卡片包装组件
    const SortableCard = ({ itemId, children }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging
        } = useSortable({ id: itemId });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.8 : 1,
            zIndex: isDragging ? 1000 : 'auto',
        };

        return (
            <div ref={setNodeRef} style={style}>
                {children({ attributes, listeners, isDragging })}
            </div>
        );
    };

    // 渲染令牌卡片
    const renderTokenCard = (token, dragProps = {}) => {
        const hasApiKey = !!token.apiKey;
        const data = queryData[token.id];

        return (
            <Card
                key={token.id}
                style={{
                    marginBottom: 12,
                    border: dragProps.isDragging ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    borderRadius: 6,
                    background: 'white',
                    transition: dragProps.isDragging ? 'none' : 'all 0.3s',
                    boxShadow: dragProps.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                    cursor: dragProps.isDragging ? 'grabbing' : 'default',
                }}
                bodyStyle={{ padding: '12px 16px' }}
            >
                <Spin spinning={data?.loading || false}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* 左侧：拖拽手柄 + 内容区 */}
                        <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                            {/* 拖拽手柄 */}
                            <div
                                {...dragProps.attributes}
                                {...dragProps.listeners}
                                className="drag-handle"
                                aria-label="拖拽排序"
                                title="拖动调整顺序"
                            >
                                <IconHandle />
                            </div>

                            {/* 内容区 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* 名称 */}
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                                    <Title heading={6} style={{ margin: 0, fontSize: 15 }}>
                                        {token.name}
                                    </Title>
                                </div>

                            {/* URL */}
                            <Text type="tertiary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                {token.baseUrl}
                            </Text>

                            {/* 查询结果 */}
                            {data && !data.loading && data.valid && (
                                <div style={{
                                    marginTop: 8,
                                    marginBottom: 4,
                                    padding: '6px 8px',
                                    background: '#f7f8fa',
                                    borderRadius: 4,
                                    fontSize: 11
                                }}>
                                    <Text style={{ fontSize: 11, marginRight: 12 }}>
                                        总额度：<Text strong>${data.balance === 100000000 ? '无限' : data.balance.toFixed(3)}</Text>
                                    </Text>
                                    <Text style={{ fontSize: 11, marginRight: 12 }}>
                                        已用：<Text strong>${data.usage.toFixed(3)}</Text>
                                    </Text>
                                    <Text style={{ fontSize: 11 }}>
                                        剩余：<Text strong style={{ color: '#52c41a' }}>${data.balance === 100000000 ? '无限' : (data.balance - data.usage).toFixed(3)}</Text>
                                    </Text>
                                </div>
                            )}
                            </div>
                        </div>

                        {/* 右侧按钮区 */}
                        <Space spacing={4}>
                            {hasApiKey && (
                                <>
                                    <Button
                                        theme="light"
                                        type="primary"
                                        icon={<IconRefresh />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fetchTokenInfo(token);
                                        }}
                                        size="small"
                                    >
                                        查询
                                    </Button>
                                    <Button
                                        theme="light"
                                        type="tertiary"
                                        icon={<IconEyeOpened />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDetail(token);
                                        }}
                                        size="small"
                                    >
                                        详情
                                    </Button>
                                </>
                            )}
                            <Button
                                theme="borderless"
                                icon={<IconEdit />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(token);
                                }}
                                size="small"
                            />
                            <Button
                                theme="borderless"
                                type="danger"
                                icon={<IconDelete />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(token);
                                }}
                                size="small"
                                disabled={tokenConfigs.length === 1}
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
                        disabled={tokenConfigs.length === 0}
                    >
                        导出
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        onClick={handleAdd}
                        type="primary"
                        size="default"
                    >
                        添加令牌
                    </Button>
                </Space>
            </div>

            {/* 令牌列表 */}
            {tokenConfigs.length === 0 ? (
                <Empty
                    image={<IconRefresh style={{ fontSize: 48, color: '#ccc' }} />}
                    title="暂无令牌配置"
                    description='点击上方"添加令牌"按钮开始配置'
                    style={{ padding: 60 }}
                />
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={tokenConfigs.map(token => token.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {tokenConfigs.map(token => (
                            <SortableCard key={token.id} itemId={token.id}>
                                {(dragProps) => renderTokenCard(token, dragProps)}
                            </SortableCard>
                        ))}
                    </SortableContext>
                </DndContext>
            )}

            {/* 添加/编辑对话框 */}
            <Modal
                title={editingToken ? '编辑令牌' : '添加令牌'}
                visible={formVisible}
                onCancel={() => setFormVisible(false)}
                onOk={handleSave}
                okText="保存"
                cancelText="取消"
                width={520}
            >
                <Form
                    getFormApi={(api) => setFormApi(api)}
                    labelPosition="top"
                    initValues={
                        editingToken
                            ? {
                                name: editingToken.name,
                                baseUrl: editingToken.baseUrl,
                                apiKey: editingToken.apiKey || ''
                              }
                            : { name: '', baseUrl: '', apiKey: '' }
                    }
                >
                    <Form.Input
                        field="name"
                        label="名称"
                        placeholder="例如：OpenAI"
                        rules={[{ required: true, message: '名称不能为空' }]}
                        style={{ marginBottom: 12 }}
                    />
                    <Form.Input
                        field="baseUrl"
                        label="Base URL"
                        placeholder="https://api.openai.com"
                        rules={[
                            { required: true, message: 'Base URL 不能为空' },
                            {
                                validator: (rule, value) => {
                                    if (value && value.endsWith('/')) {
                                        return '结尾不要带 /';
                                    }
                                    return true;
                                }
                            }
                        ]}
                        extraText="结尾不要带 /"
                        style={{ marginBottom: 12 }}
                    />
                    <Form.Input
                        field="apiKey"
                        label="API Key"
                        placeholder="sk-..."
                        mode="password"
                        rules={[{ required: true, message: 'API Key 不能为空' }]}
                        style={{ marginBottom: 0 }}
                    />
                </Form>
            </Modal>

            {/* 详情Modal */}
            <Modal
                title={`令牌详情 - ${detailToken?.name || ''}`}
                visible={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={900}
            >
                {detailToken && (
                    <Collapse
                        activeKey={detailActiveKeys}
                        onChange={(keys) => {
                            if (keys.length === 0) {
                                setDetailActiveKeys(['1', '2']);
                            } else {
                                setDetailActiveKeys(keys);
                            }
                        }}
                    >
                        {/* 令牌信息 */}
                        <Panel
                            header="令牌信息"
                            itemKey="1"
                        >
                            <Spin spinning={detailLoading}>
                                <div style={{ marginBottom: 16 }}>
                                    {queryData[detailToken.id] && queryData[detailToken.id].valid ? (
                                        <>
                                            <Text type="secondary">
                                                令牌总额：${queryData[detailToken.id].balance === 100000000 ? '无限' : queryData[detailToken.id].balance.toFixed(3)}
                                            </Text>
                                            <br /><br />
                                            <Text type="secondary">
                                                剩余额度：${queryData[detailToken.id].balance === 100000000 ? '无限制' : (queryData[detailToken.id].balance - queryData[detailToken.id].usage).toFixed(3)}
                                            </Text>
                                            <br /><br />
                                            <Text type="secondary">
                                                已用额度：${queryData[detailToken.id].balance === 100000000 ? '不进行计算' : queryData[detailToken.id].usage.toFixed(3)}
                                            </Text>
                                            <br /><br />
                                            <Text type="secondary">
                                                有效期至：{queryData[detailToken.id].accessdate === 0 ? '永不过期' : '未知'}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text type="tertiary">暂无数据，请先查询</Text>
                                    )}
                                </div>
                            </Spin>
                        </Panel>

                        {/* 调用详情 */}
                        <Panel
                            header="调用详情"
                            itemKey="2"
                            extra={
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Tag color='green' style={{ marginRight: 5 }}>计算汇率：$1 = 50 0000 tokens</Tag>
                                </div>
                            }
                        >
                            <Spin spinning={detailLoading}>
                                {detailLogs.length > 0 ? (
                                    <Table
                                        columns={[
                                            {
                                                title: '时间',
                                                dataIndex: 'created_at',
                                                key: 'created_at',
                                                render: (text) => timestamp2string(text),
                                            },
                                            {
                                                title: '模型',
                                                dataIndex: 'model_name',
                                                key: 'model_name',
                                            },
                                            {
                                                title: '用时',
                                                dataIndex: 'use_time',
                                                key: 'use_time',
                                                render: (time) => {
                                                    const t = parseInt(time);
                                                    if (t < 101) {
                                                        return <Tag color="green" size="large"> {t} s </Tag>;
                                                    } else if (t < 300) {
                                                        return <Tag color="orange" size="large"> {t} s </Tag>;
                                                    } else {
                                                        return <Tag color="red" size="large"> {t} s </Tag>;
                                                    }
                                                },
                                            },
                                            {
                                                title: '提示',
                                                dataIndex: 'prompt_tokens',
                                                key: 'prompt_tokens',
                                            },
                                            {
                                                title: '补全',
                                                dataIndex: 'completion_tokens',
                                                key: 'completion_tokens',
                                            },
                                            {
                                                title: '花费',
                                                dataIndex: 'quota',
                                                key: 'quota',
                                                render: (quota) => `$${(quota / 500000).toFixed(6)}`,
                                            },
                                        ]}
                                        dataSource={detailLogs}
                                        pagination={{
                                            pageSize: ITEMS_PER_PAGE,
                                            hideOnSinglePage: true,
                                        }}
                                    />
                                ) : (
                                    <Empty description="该服务商不支持使用明细查询，或暂无调用记录" />
                                )}
                            </Spin>
                        </Panel>
                    </Collapse>
                )}
            </Modal>
        </div>
    );
};

export default TokenConfigManager;
