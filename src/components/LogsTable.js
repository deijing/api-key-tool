import React, { useState } from 'react';
import { Button, Input, Typography, Table, Tag, Spin, Card, Collapse, Toast, Space, Tabs, TabPane, Progress } from '@douyinfe/semi-ui';
import { IconSearch, IconCopy, IconDownload, IconUpload } from '@douyinfe/semi-icons';
import { API, timestamp2string, copy, getConfig } from '../helpers';
import { getAllApiConfigs, getAllTokenConfigs, addApiConfig, addTokenConfig } from '../helpers/utils';
import { stringToColor } from '../helpers/render';
import ApiConfigManager from './ApiConfigManager';
import TokenConfigManager from './TokenConfigManager';
import { ITEMS_PER_PAGE } from '../constants';
import { renderQuota } from '../helpers/render';
import { Modal } from '@douyinfe/semi-ui';
import Papa from 'papaparse';

const { Text } = Typography;
const { Panel } = Collapse;

function renderTimestamp(timestamp) {
    return timestamp2string(timestamp);
}

function renderIsStream(bool) {
    if (bool) {
        return <Tag color="blue" size="large">流</Tag>;
    } else {
        return <Tag color="purple" size="large">非流</Tag>;
    }
}

function renderUseTime(type) {
    const time = parseInt(type);
    if (time < 101) {
        return <Tag color="green" size="large"> {time} s </Tag>;
    } else if (time < 300) {
        return <Tag color="orange" size="large"> {time} s </Tag>;
    } else {
        return <Tag color="red" size="large"> {time} s </Tag>;
    }
}

const KeyUsage = () => {
    // Tab切换状态 - 从localStorage读取上次的tab,如果没有则默认'token'
    const [activeTab, setActiveTab] = useState(() => {
        const savedTab = localStorage.getItem('active_tab');
        return savedTab || 'token';
    });

    // 令牌查询相关状态
    const [key, setKey] = useState('');
    const [tokenBaseUrl, setTokenBaseUrl] = useState('https://api.openai.com'); // 令牌查询的BaseUrl，可自定义
    const [balance, setBalance] = useState(0);
    const [usage, setUsage] = useState(0);
    const [accessdate, setAccessDate] = useState(0);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeKeys, setActiveKeys] = useState([]);
    const [tokenValid, setTokenValid] = useState(false);

    // 账户查询相关状态
    const [accessToken, setAccessToken] = useState('');
    const [userId, setUserId] = useState('');
    const [showPassword, setShowPassword] = useState(false); // 控制密码显示
    const [accountData, setAccountData] = useState({
        planName: '',
        total: 0,
        remaining: 0,
        used: 0,
        unit: 'USD'
    });
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountValid, setAccountValid] = useState(false);

    // 从配置中读取设置（优先使用 localStorage，否则使用环境变量）
    const showDetail = getConfig('SHOW_DETAIL');
    const showBalance = getConfig('SHOW_BALANCE');
    const baseUrl = getConfig('BASE_URL');
    // const [quotaPerUnit, setQuotaPerUnit] = useState('未知');

    // const fetchQuotaPerUnit = async () => {
    //     try {
    //         const res = await API.get(`${process.env.REACT_APP_BASE_URL}/api/status`);
    //         const { success, data } = res.data;
    //         if (success) {
    //             setQuotaPerUnit(data.quota_per_unit);
    //         } else {
    //             throw new Error('获取站点汇率失败');
    //         }
    //     } catch (e) {
    //         Toast.error(e.message);
    //     }
    // };

    // useEffect(() => {
    //     fetchQuotaPerUnit();
    // }, []);

    const resetData = () => {
        setBalance("未知");
        setUsage("未知");
        setAccessDate("未知");
        setLogs([]);
        setTokenValid(false);
    };

    const fetchData = async () => {
        if (key === '') {
            Toast.warning('请先输入令牌，再进行查询');
            return;
        }
        // 检查令牌格式：支持不同长度的 sk- 开头的令牌（至少20个字符）
        if (!/^sk-[a-zA-Z0-9]{20,}$/.test(key)) {
            Toast.error('令牌格式非法！令牌必须以 sk- 开头，且至少包含20个字符');
            return;
        }
        setLoading(true);
        try {
            if (showBalance) {
                // 通过Vercel云函数代理请求
                const subscription = await API.get('/api/proxy/v1/dashboard/billing/subscription', {
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'X-Target-BaseUrl': tokenBaseUrl  // 使用令牌查询的自定义BaseUrl
                    },
                });
                const subscriptionData = subscription.data;
                setBalance(subscriptionData.hard_limit_usd);
                setTokenValid(true);

                let now = new Date();
                let start = new Date(now.getTime() - 100 * 24 * 3600 * 1000);
                let start_date = start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate();
                let end_date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
                const res = await API.get(`/api/proxy/v1/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`, {
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'X-Target-BaseUrl': tokenBaseUrl
                    },
                });
                const data = res.data;
                setUsage(data.total_usage / 100);
            }

            if (showDetail) {
                const logRes = await API.get(`/api/proxy/api/log/token?key=${key}`, {
                    headers: {
                        'X-Target-BaseUrl': tokenBaseUrl
                    }
                });
                const { success, data: logData } = logRes.data;
                if (success) {
                    setLogs(logData.reverse());
                    setActiveKeys(['1', '2']); // 自动展开两个折叠面板
                } else {
                    Toast.error('查询调用详情失败，请输入正确的令牌');
                }
            }
            setLoading(false);
        } catch (e) {
            console.error('[LogsTable] 查询失败:', e);
            // 详细的错误信息
            let errorMsg = '查询失败，请输入正确的令牌';
            if (e.response) {
                errorMsg = `查询失败：${e.response.data?.message || e.response.statusText || '服务器错误'}`;
                console.error('[LogsTable] 服务器响应:', e.response.data);
            } else if (e.request) {
                errorMsg = '查询失败：无法连接到服务器，请检查网络';
                console.error('[LogsTable] 无响应:', e.request);
            } else {
                errorMsg = `查询失败：${e.message}`;
            }
            Toast.error(errorMsg);
            resetData(); // 如果发生错误，重置所有数据为默认值
            setLoading(false);
            return;
        }
    };

    const fetchAccountData = async () => {
        // 输入验证和格式化
        const trimmedToken = accessToken.trim();
        const trimmedUserId = userId.trim();

        if (!trimmedToken || !trimmedUserId) {
            Toast.warning('请输入访问令牌和用户ID');
            return;
        }

        // 开始查询前先重置旧数据
        resetAccountData();
        setAccountLoading(true);

        try {
            // 通过Vercel云函数代理请求
            const res = await API.get('/api/proxy/api/user/self', {
                headers: {
                    'Authorization': `Bearer ${trimmedToken}`,
                    'New-Api-User': trimmedUserId,
                    'X-Target-BaseUrl': baseUrl  // 云函数根据这个头转发请求
                },
            });

            if (res.data.success && res.data.data) {
                const data = res.data.data;
                setAccountData({
                    planName: data.group || '默认套餐',
                    remaining: data.quota / 500000,
                    used: data.used_quota / 500000,
                    total: (data.quota + data.used_quota) / 500000,
                    unit: 'USD'
                });
                setAccountValid(true);
                Toast.success('查询成功');
            } else {
                const errorMsg = res.data.message || '查询失败';
                Toast.error(`查询失败: ${errorMsg}`);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.message || e.message || '未知错误';
            Toast.error(`查询失败: ${errorMsg}。请检查访问令牌和用户ID是否正确`);
        } finally {
            setAccountLoading(false);
        }
    };

    const resetAccountData = () => {
        setAccountData({
            planName: '',
            total: 0,
            remaining: 0,
            used: 0,
            unit: 'USD'
        });
        setAccountValid(false);
    };

    const copyText = async (text) => {
        if (await copy(text)) {
            Toast.success('已复制：' + text);
        } else {
            Modal.error({ title: '无法复制到剪贴板，请手动复制', content: text });
        }
    };

    const columns = [
        {
            title: '时间',
            dataIndex: 'created_at',
            render: renderTimestamp,
            sorter: (a, b) => a.created_at - b.created_at,
        },
        {
            title: '令牌名称',
            dataIndex: 'token_name',
            render: (text, record, index) => {
                return record.type === 0 || record.type === 2 ? (
                    <div>
                        <Tag
                            color="grey"
                            size="large"
                            onClick={() => {
                                copyText(text);
                            }}
                        >
                            {' '}
                            {text}{' '}
                        </Tag>
                    </div>
                ) : (
                    <></>
                );
            },
            sorter: (a, b) => ('' + a.token_name).localeCompare(b.token_name),
        },
        {
            title: '模型',
            dataIndex: 'model_name',
            render: (text, record, index) => {
                return record.type === 0 || record.type === 2 ? (
                    <div>
                        <Tag
                            color={stringToColor(text)}
                            size="large"
                            onClick={() => {
                                copyText(text);
                            }}
                        >
                            {' '}
                            {text}{' '}
                        </Tag>
                    </div>
                ) : (
                    <></>
                );
            },
            sorter: (a, b) => ('' + a.model_name).localeCompare(b.model_name),
        },
        {
            title: '用时',
            dataIndex: 'use_time',
            render: (text, record, index) => {
                return (
                    <div>
                        <Space>
                            {renderUseTime(text)}
                            {renderIsStream(record.is_stream)}
                        </Space>
                    </div>
                );
            },
            sorter: (a, b) => a.use_time - b.use_time,
        },
        {
            title: '提示',
            dataIndex: 'prompt_tokens',
            render: (text, record, index) => {
                return record.type === 0 || record.type === 2 ? <div>{<span> {text} </span>}</div> : <></>;
            },
            sorter: (a, b) => a.prompt_tokens - b.prompt_tokens,
        },
        {
            title: '补全',
            dataIndex: 'completion_tokens',
            render: (text, record, index) => {
                return parseInt(text) > 0 && (record.type === 0 || record.type === 2) ? (
                    <div>{<span> {text} </span>}</div>
                ) : (
                    <></>
                );
            },
            sorter: (a, b) => a.completion_tokens - b.completion_tokens,
        },
        {
            title: '花费',
            dataIndex: 'quota',
            render: (text, record, index) => {
                return record.type === 0 || record.type === 2 ? <div>{renderQuota(text, 6)}</div> : <></>;
            },
            sorter: (a, b) => a.quota - b.quota,
        },
        // {
        //     title: '详情',
        //     dataIndex: 'content',
        //     render: (text, record, index) => {
        //         if (record.other === '') {
        //             record.other = '{}';
        //         }
        //         let other = JSON.parse(record.other);
        //         if (other == null) {
        //             return (
        //                 <Paragraph
        //                     ellipsis={{
        //                         rows: 2,
        //                         showTooltip: {
        //                             type: 'popover',
        //                         },
        //                     }}
        //                 >
        //                     {text}
        //                 </Paragraph>
        //             );
        //         }
        //         let content = renderModelPrice(
        //             record.prompt_tokens,
        //             record.completion_tokens,
        //             other.model_ratio,
        //             other.model_price,
        //             other.completion_ratio,
        //             other.group_ratio,
        //         );
        //         return (
        //             <Tooltip content={content}>
        //                 <Paragraph
        //                     ellipsis={{
        //                         rows: 2,
        //                     }}
        //                 >
        //                     {text}
        //                 </Paragraph>
        //             </Tooltip>
        //         );
        //     },
        // },
    ];

    const copyTokenInfo = (e) => {
        e.stopPropagation();
        const info = `令牌总额: ${balance === 100000000 ? '无限' : `$${balance.toFixed(3)}`}
剩余额度: ${balance === 100000000 ? '无限制' : `$${(balance - usage).toFixed(3)}`}
已用额度: ${balance === 100000000 ? '不进行计算' : `$${usage.toFixed(3)}`}
有效期至: ${accessdate === 0 ? '永不过期' : renderTimestamp(accessdate)}`;
        copyText(info);
    };

    const copyAccountInfo = (e) => {
        e.stopPropagation();
        const usageRate = accountData.total > 0 ? ((accountData.used / accountData.total) * 100).toFixed(2) : '0.00';
        const info = `套餐名称: ${accountData.planName}
总额度: $${accountData.total.toFixed(3)}
剩余额度: $${accountData.remaining.toFixed(3)}
已用额度: $${accountData.used.toFixed(3)}
使用率: ${usageRate}%`;
        copyText(info);
    };

    const exportCSV = (e) => {
        e.stopPropagation();
        const csvData = logs.map(log => ({
            '时间': renderTimestamp(log.created_at),
            '模型': log.model_name,
            '用时': log.use_time,
            '提示': log.prompt_tokens,
            '补全': log.completion_tokens,
            '花费': log.quota,
            '详情': log.content,
        }));
        const csvString = '\ufeff' + Papa.unparse(csvData);  // 使用PapaParse库来转换数据
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
        // 保存当前tab到localStorage,刷新后保持在同一页面
        localStorage.setItem('active_tab', key);
        // 切换离开账户页时清理状态，保持干净
        if (key !== 'account' && accountValid) {
            // 可选：切换时不清理，保留数据供用户返回查看
            // resetAccountData();
        }
    };

    // 导出全部配置（API配置 + 令牌配置）
    const handleExportAllConfigs = () => {
        const apiConfigs = getAllApiConfigs();
        const tokenConfigs = getAllTokenConfigs();

        if (apiConfigs.length === 0 && tokenConfigs.length === 0) {
            Toast.warning('暂无配置可导出');
            return;
        }

        // 导出时移除敏感信息，只保留核心配置
        const exportData = {
            apiConfigs: apiConfigs.map(({ name, baseUrl, accessToken, userId }) => ({
                name,
                baseUrl,
                accessToken,
                userId
            })),
            tokenConfigs: tokenConfigs.map(({ name, baseUrl, apiKey }) => ({
                name,
                baseUrl,
                apiKey
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all-configs-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Toast.success(`已导出 ${apiConfigs.length} 个API配置和 ${tokenConfigs.length} 个令牌配置`);
    };

    // 导入全部配置
    const handleImportAllConfigs = () => {
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

                    if (!importData.apiConfigs && !importData.tokenConfigs) {
                        Toast.error('文件格式错误：应包含apiConfigs或tokenConfigs字段');
                        return;
                    }

                    let apiSuccessCount = 0;
                    let apiFailCount = 0;
                    let tokenSuccessCount = 0;
                    let tokenFailCount = 0;

                    // 导入API配置
                    if (importData.apiConfigs && Array.isArray(importData.apiConfigs)) {
                        importData.apiConfigs.forEach((config) => {
                            const { name, baseUrl, accessToken, userId } = config;
                            if (!name || !baseUrl) {
                                apiFailCount++;
                                return;
                            }
                            const result = addApiConfig(name, baseUrl, accessToken || '', userId || '');
                            if (result) {
                                apiSuccessCount++;
                            } else {
                                apiFailCount++;
                            }
                        });
                    }

                    // 导入令牌配置
                    if (importData.tokenConfigs && Array.isArray(importData.tokenConfigs)) {
                        importData.tokenConfigs.forEach((config) => {
                            const { name, baseUrl, apiKey } = config;
                            if (!name || !baseUrl) {
                                tokenFailCount++;
                                return;
                            }
                            const result = addTokenConfig(name, baseUrl, apiKey || '');
                            if (result) {
                                tokenSuccessCount++;
                            } else {
                                tokenFailCount++;
                            }
                        });
                    }

                    const totalSuccess = apiSuccessCount + tokenSuccessCount;
                    const totalFail = apiFailCount + tokenFailCount;

                    if (totalSuccess > 0 && totalFail === 0) {
                        Toast.success(`成功导入：API配置 ${apiSuccessCount} 个，令牌配置 ${tokenSuccessCount} 个`);
                    } else if (totalSuccess > 0 && totalFail > 0) {
                        Toast.warning(`导入完成：成功 ${totalSuccess} 个，失败 ${totalFail} 个`);
                    } else {
                        Toast.error(`导入失败：${totalFail} 个配置无效`);
                    }

                    // 刷新页面以显示新配置
                    window.location.reload();
                } catch (error) {
                    console.error('[LogsTable] 导入失败:', error);
                    Toast.error('文件解析失败，请检查JSON格式');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <Card
            title={
                <Space>
                    <Button
                        icon={<IconUpload />}
                        onClick={handleImportAllConfigs}
                        size="small"
                    >
                        导入全部配置
                    </Button>
                    <Button
                        icon={<IconDownload />}
                        onClick={handleExportAllConfigs}
                        size="small"
                    >
                        导出全部配置
                    </Button>
                </Space>
            }
        >
            <Tabs activeKey={activeTab} onChange={handleTabChange} type="line">
                <TabPane tab="令牌查询" itemKey="token">
                    {/* Base URL 输入框 */}
                    <div style={{ marginBottom: 12 }}>
                        <Input
                            showClear
                            value={tokenBaseUrl}
                            onChange={(value) => setTokenBaseUrl(value)}
                            placeholder="请输入API的Base URL（例如：https://api.openai.com）"
                            addonBefore="Base URL"
                            style={{ width: '100%' }}
                        />
                        <Text type="tertiary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            临时查询用，适合测试不同API服务商的令牌。长期使用请在"令牌配置管理"中添加
                        </Text>
                    </div>
                    {/* 令牌输入框 */}
                    <div style={{ marginBottom: 16 }}>
                        <Input
                            showClear
                            value={key}
                            onChange={(value) => setKey(value)}
                            placeholder="请输入要查询的令牌（sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）"
                            prefix={<IconSearch />}
                            suffix={
                                <Button
                                    onClick={fetchData}
                                    loading={loading}
                                >
                                    查询
                                </Button>
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    fetchData();
                                }
                            }}
                        />
                    </div>
                    <Collapse activeKey={activeKeys} onChange={(keys) => {
                        if (keys.length === 0) {
                            setActiveKeys(['1', '2']);
                        } else {
                            setActiveKeys(keys);
                        }
                    }}>
                {showBalance && (
                    <Panel
                        header="令牌信息"
                        itemKey="1"
                        extra={
                            <Button icon={<IconCopy />} theme='borderless' type='primary' onClick={(e) => copyTokenInfo(e)} disabled={!tokenValid}>
                                复制令牌信息
                            </Button>
                        }
                        disabled={!tokenValid}
                    >
                        <Spin spinning={loading}>
                            <div style={{ marginBottom: 16 }}>
                                <Text type="secondary">
                                    令牌总额：{balance === 100000000 ? "无限" : balance === "未知" ? "未知" : `$${balance.toFixed(3)}`}
                                </Text>
                                <br /><br />
                                <Text type="secondary">
                                    剩余额度：{balance === 100000000 ? "无限制" : balance === "未知" || usage === "未知" ? "未知" : `$${(balance - usage).toFixed(3)}`}
                                </Text>
                                <br /><br />
                                <Text type="secondary">
                                    已用额度：{balance === 100000000 ? "不进行计算" : usage === "未知" ? "未知" : `$${usage.toFixed(3)}`}
                                </Text>
                                <br /><br />
                                <Text type="secondary">
                                    有效期至：{accessdate === 0 ? '永不过期' : accessdate === "未知" ? '未知' : renderTimestamp(accessdate)}
                                </Text>
                            </div>
                        </Spin>
                    </Panel>
                )}
                {showDetail && (
                    <Panel
                        header="调用详情"
                        itemKey="2"
                        extra={
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Tag color='green' style={{ marginRight: 5 }}>计算汇率：$1 = 50 0000 tokens</Tag>
                                <Button icon={<IconDownload />} theme='borderless' type='primary' onClick={(e) => exportCSV(e)} disabled={!tokenValid || logs.length === 0}>
                                    导出为CSV文件
                                </Button>
                            </div>
                        }
                        disabled={!tokenValid}
                    >
                        <Spin spinning={loading}>
                            <Table
                                columns={columns}
                                dataSource={logs}
                                pagination={{
                                    pageSize: ITEMS_PER_PAGE,
                                    hideOnSinglePage: true,
                                }}
                            />
                        </Spin>
                    </Panel>
                )}
                    </Collapse>
                </TabPane>
                <TabPane tab="API 配置管理" itemKey="apiConfig">
                    <ApiConfigManager />
                </TabPane>
                <TabPane tab="令牌配置管理" itemKey="tokenConfig">
                    <TokenConfigManager />
                </TabPane>
            </Tabs>
        </Card>
    );
};

export default KeyUsage;
