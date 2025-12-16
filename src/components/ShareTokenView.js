import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Typography, Space, Tag, Table, Button, Empty, Collapse, DatePicker, Spin } from '@douyinfe/semi-ui';
import { IconClose, IconRefresh } from '@douyinfe/semi-icons';
import { timestamp2string, maskApiKey } from '../helpers/utils';
import { ITEMS_PER_PAGE } from '../constants';
import { API } from '../helpers/api';

const { Text, Title } = Typography;
const { Panel } = Collapse;

// 日期快捷选项
const datePresets = [
    {
        text: '今日',
        start: new Date(new Date().setHours(0, 0, 0, 0)),
        end: new Date(),
    },
    {
        text: '7天',
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
    },
    {
        text: '30天',
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
    },
    {
        text: '3个月',
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date(),
    },
];

/**
 * 分享令牌详情视图组件
 * 支持两种模式：
 * - v1（旧格式）：显示快照数据
 * - v2（新格式）：实时查询 API 获取数据
 */
const ShareTokenView = ({ visible, shareData, onClose }) => {
    const [activeKeys, setActiveKeys] = useState(['1', '2']);
    const [dateRange, setDateRange] = useState([]);

    // 实时查询相关状态
    const [loading, setLoading] = useState(false);
    const [queryData, setQueryData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);
    const [queriedAt, setQueriedAt] = useState(null);

    // 解构分享数据
    const { version, token = {}, sharedAt } = shareData || {};

    // v1 旧格式的快照数据
    const snapshotQueryData = shareData?.queryData;
    const snapshotLogs = shareData?.logs || [];

    // 实时查询函数
    const fetchData = useCallback(async () => {
        if (!token.apiKey || !token.baseUrl) {
            setError('缺少必要的配置信息');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. 查询订阅信息（余额）
            const subscription = await API.get('/api/proxy/v1/dashboard/billing/subscription', {
                headers: {
                    'Authorization': `Bearer ${token.apiKey}`,
                    'X-Target-BaseUrl': token.baseUrl
                }
            });
            const balance = subscription.data.hard_limit_usd || 0;

            // 2. 查询使用量（过去100天）
            let usage = 0;
            try {
                let now = new Date();
                let start = new Date(now.getTime() - 100 * 24 * 3600 * 1000);
                let start_date = start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate();
                let end_date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
                const usageRes = await API.get(`/api/proxy/v1/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`, {
                    headers: {
                        'Authorization': `Bearer ${token.apiKey}`,
                        'X-Target-BaseUrl': token.baseUrl
                    }
                });
                usage = usageRes.data.total_usage / 100;
            } catch (usageErr) {
                console.log('[ShareTokenView] 查询用量失败:', usageErr);
            }

            // 3. 查询日志（用于调用详情表格）
            try {
                const logRes = await API.get(`/api/proxy/api/log/token?key=${token.apiKey}`, {
                    headers: {
                        'X-Target-BaseUrl': token.baseUrl
                    }
                });
                const { success, data: logData } = logRes.data;
                if (success && logData && Array.isArray(logData)) {
                    setLogs(logData);
                }
            } catch (logErr) {
                console.log('[ShareTokenView] 查询日志失败:', logErr);
                setLogs([]);
            }

            setQueryData({
                balance,
                usage,
                accessdate: 0,
                valid: true,
            });

            setQueriedAt(Date.now());
        } catch (err) {
            console.error('[ShareTokenView] 查询失败:', err);
            const message = err.response?.data?.error?.message
                || err.response?.data?.message
                || err.message
                || '查询失败';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [token.apiKey, token.baseUrl]);

    // v2 格式时自动查询
    useEffect(() => {
        if (visible && version === 2 && token.apiKey) {
            fetchData();
        }
    }, [visible, version, token.apiKey, fetchData]);

    // 重置状态
    useEffect(() => {
        if (!visible) {
            setQueryData(null);
            setLogs([]);
            setError(null);
            setQueriedAt(null);
            setDateRange([]);
        }
    }, [visible]);

    // 根据版本决定使用哪些数据
    const displayQueryData = version === 2 ? queryData : snapshotQueryData;
    const displayLogs = version === 2 ? logs : snapshotLogs;

    // 日期筛选
    const hasDateFilter = dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1];

    const filteredLogs = useMemo(() => {
        if (!hasDateFilter || !displayLogs || !Array.isArray(displayLogs)) return displayLogs || [];
        const [startDate, endDate] = dateRange;
        const startTime = startDate.getTime();
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        const endTime = endDateTime.getTime();

        return displayLogs.filter(log => {
            if (!log || typeof log !== 'object' || log.created_at == null) return false;
            const logTime = log.created_at > 10000000000 ? log.created_at : log.created_at * 1000;
            return logTime >= startTime && logTime <= endTime;
        });
    }, [displayLogs, dateRange, hasDateFilter]);

    if (!shareData) return null;

    // 格式化时间
    const sharedAtStr = sharedAt ? timestamp2string(sharedAt) : '';
    const queriedAtStr = queriedAt ? timestamp2string(queriedAt) : '';

    // 显示的 API Key（v2 脱敏显示，v1 保持原样）
    const displayApiKey = version === 2 ? maskApiKey(token.apiKey) : token.apiKey;

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
                    <Space>
                        <Title heading={5} style={{ margin: 0 }}>
                            {token.name || '分享的令牌'}
                        </Title>
                        <Tag color={version === 2 ? 'green' : 'blue'} size="small">
                            {version === 2 ? '实时查询' : '只读快照'}
                        </Tag>
                    </Space>
                    <Button
                        icon={<IconClose />}
                        theme="borderless"
                        type="tertiary"
                        onClick={onClose}
                        title="关闭"
                    />
                </div>
            }
            visible={visible}
            onCancel={onClose}
            className="modal-pop"
            footer={
                <div style={{ textAlign: 'center' }}>
                    {version === 2 && queriedAtStr && (
                        <Text type="tertiary" size="small">
                            查询于 {queriedAtStr}
                        </Text>
                    )}
                    {version === 1 && sharedAtStr && (
                        <Text type="tertiary" size="small">
                            分享于 {sharedAtStr}
                        </Text>
                    )}
                </div>
            }
            fullScreen
            width="100%"
            bodyStyle={{
                height: 'calc(100vh - 120px)',
                overflow: 'auto',
                padding: '24px 48px',
            }}
            closeIcon={null}
        >
            {/* 加载状态 */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>
                        <Text type="tertiary">正在查询令牌信息...</Text>
                    </div>
                </div>
            )}

            {/* 错误状态 */}
            {!loading && error && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Empty
                        description={
                            <div>
                                <Text type="danger">{error}</Text>
                                <br />
                                <Button
                                    icon={<IconRefresh />}
                                    style={{ marginTop: 16 }}
                                    onClick={fetchData}
                                >
                                    重新查询
                                </Button>
                            </div>
                        }
                    />
                </div>
            )}

            {/* 赞助商信息 */}
            {!loading && !error && (
                <div
                    style={{
                        marginBottom: 20,
                        padding: '12px 16px',
                        background: 'var(--semi-color-fill-0)',
                        borderRadius: 8,
                        cursor: 'pointer',
                    }}
                    onClick={() => window.open('https://api.ikuncode.cc', '_blank')}
                >
                    <Space>
                        <img
                            src={process.env.PUBLIC_URL + '/logo.png'}
                            alt="IkunCode"
                            style={{ height: 36, width: 36, borderRadius: 6 }}
                        />
                        <div>
                            <Text strong style={{ fontSize: 15 }}>IkunCode 中转站</Text>
                            <br />
                            <Text type="tertiary" size="small">由 IkunCode 赞助开发</Text>
                        </div>
                    </Space>
                </div>
            )}

            {/* 正常内容 */}
            {!loading && !error && (
                <Collapse
                    activeKey={activeKeys}
                    onChange={(keys) => {
                        if (keys.length === 0) {
                            setActiveKeys(['1', '2']);
                        } else {
                            setActiveKeys(keys);
                        }
                    }}
                >
                    {/* 令牌信息 */}
                    <Panel header="令牌信息" itemKey="1">
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary" style={{ display: 'inline-block', width: 100 }}>名称：</Text>
                                <Text strong>{token.name || '-'}</Text>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary" style={{ display: 'inline-block', width: 100 }}>服务地址：</Text>
                                <Text copyable>{token.baseUrl || '-'}</Text>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary" style={{ display: 'inline-block', width: 100 }}>API Key：</Text>
                                <Text code>{displayApiKey || '-'}</Text>
                                <Tag color="orange" size="small" style={{ marginLeft: 8 }}>已脱敏</Tag>
                            </div>
                            {token.website && /^https?:\/\//i.test(token.website) && (
                                <div style={{ marginBottom: 12 }}>
                                    <Text type="secondary" style={{ display: 'inline-block', width: 100 }}>官网：</Text>
                                    <Text link={{ href: token.website, target: '_blank', rel: 'noopener noreferrer' }}>{token.website}</Text>
                                </div>
                            )}

                            <div style={{ marginTop: 20, padding: 16, background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
                                {displayQueryData && displayQueryData.valid !== undefined ? (
                                    <Space wrap style={{ gap: '24px 48px' }}>
                                        <div>
                                            <Text type="tertiary" size="small">令牌总额</Text>
                                            <br />
                                            <Text strong style={{ fontSize: 18 }}>
                                                ${displayQueryData.balance === 100000000 ? '无限' : (displayQueryData.balance?.toFixed(3) || '0.000')}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="tertiary" size="small">已用额度</Text>
                                            <br />
                                            <Text strong style={{ fontSize: 18 }}>
                                                ${displayQueryData.balance === 100000000 ? '不计算' : (displayQueryData.usage?.toFixed(3) || '0.000')}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="tertiary" size="small">剩余额度</Text>
                                            <br />
                                            <Text strong style={{ fontSize: 18, color: 'var(--semi-color-success)' }}>
                                                ${displayQueryData.balance === 100000000 ? '无限制' : ((displayQueryData.balance - displayQueryData.usage)?.toFixed(3) || '0.000')}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="tertiary" size="small">有效期</Text>
                                            <br />
                                            <Text strong style={{ fontSize: 18 }}>
                                                {displayQueryData.accessdate === 0 ? '永不过期' : (displayQueryData.accessdate || '未知')}
                                            </Text>
                                        </div>
                                        {version === 2 && (
                                            <div>
                                                <Button
                                                    icon={<IconRefresh />}
                                                    theme="borderless"
                                                    onClick={fetchData}
                                                    loading={loading}
                                                >
                                                    刷新
                                                </Button>
                                            </div>
                                        )}
                                    </Space>
                                ) : (
                                    <Text type="tertiary">暂无额度数据</Text>
                                )}
                            </div>
                        </div>
                    </Panel>

                    {/* 调用详情 */}
                    <Panel
                        header="调用详情"
                        itemKey="2"
                        extra={
                            <Tag color='green' style={{ marginRight: 5 }}>计算汇率：$1 = 50 0000 tokens</Tag>
                        }
                    >
                        {/* 日期筛选区域 */}
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <Text type="tertiary" style={{ fontSize: 13 }}>日期筛选：</Text>
                                <DatePicker
                                    type="dateRange"
                                    value={dateRange}
                                    onChange={(dates) => setDateRange(dates || [])}
                                    placeholder={['开始日期', '结束日期']}
                                    style={{ width: 260 }}
                                    presets={datePresets}
                                    presetPosition="left"
                                />
                                {hasDateFilter && (
                                    <Button
                                        size="small"
                                        theme="borderless"
                                        onClick={() => setDateRange([])}
                                    >
                                        清除筛选
                                    </Button>
                                )}
                            </Space>
                            <Text type="tertiary" style={{ fontSize: 12 }}>
                                共 {filteredLogs.length} 条记录
                                {hasDateFilter && displayLogs.length !== filteredLogs.length && (
                                    <span>（原 {displayLogs.length} 条）</span>
                                )}
                            </Text>
                        </div>

                        {filteredLogs.length > 0 ? (
                            <Table
                                className="table-row-hover"
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
                                dataSource={filteredLogs}
                                pagination={{
                                    pageSize: ITEMS_PER_PAGE,
                                    hideOnSinglePage: true,
                                }}
                            />
                        ) : (
                            <Empty
                                description={
                                    displayLogs && displayLogs.length > 0 && hasDateFilter
                                        ? "当前日期范围内无调用记录"
                                        : "暂无调用记录"
                                }
                            />
                        )}
                    </Panel>
                </Collapse>
            )}

            {/* 底部关闭按钮 */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button
                    type="primary"
                    size="large"
                    onClick={onClose}
                    style={{ minWidth: 200 }}
                >
                    关闭
                </Button>

                {/* GitHub 链接 */}
                <div style={{ marginTop: 16 }}>
                    <Text
                        link={{ href: 'https://github.com/deijing/api-key-tool', target: '_blank' }}
                        type="tertiary"
                        size="small"
                    >
                        开源项目 by 鸡弟 · GitHub
                    </Text>
                </div>
            </div>
        </Modal>
    );
};

export default ShareTokenView;
