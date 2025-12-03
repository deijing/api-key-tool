import React, { useState, useEffect } from 'react';
import { Modal, Switch, Button, Toast, Space, Typography } from '@douyinfe/semi-ui';
import { getAllConfig, saveAllConfig } from '../helpers/utils';

const { Title } = Typography;

const SettingsPanel = ({ visible, onClose, onConfigChange }) => {
    const [showDetail, setShowDetail] = useState(true);
    const [showBalance, setShowBalance] = useState(true);

    // 加载配置
    useEffect(() => {
        if (visible) {
            const config = getAllConfig();
            setShowDetail(config.showDetail);
            setShowBalance(config.showBalance);
        }
    }, [visible]);

    // 保存显示配置
    const handleSave = () => {
        saveAllConfig({ showDetail, showBalance });
        Toast.success('配置已保存，刷新页面后生效');
        if (onConfigChange) {
            onConfigChange();
        }
        onClose();
    };

    return (
        <Modal
            title="显示设置"
            visible={visible}
            onCancel={onClose}
            footer={
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onClose} style={{ marginRight: 8 }}>
                        取消
                    </Button>
                    <Button onClick={handleSave} type="primary">
                        保存
                    </Button>
                </div>
            }
            width={500}
        >
            <div style={{ padding: '16px 0' }}>
                <Title heading={6} style={{ marginBottom: 16 }}>
                    选择要显示的信息
                </Title>
                <Space vertical align="start" spacing={16}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Switch
                            checked={showDetail}
                            onChange={setShowDetail}
                        />
                        <div style={{ marginLeft: 12 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>展示使用明细</div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                开启后将显示令牌的详细调用记录
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Switch
                            checked={showBalance}
                            onChange={setShowBalance}
                        />
                        <div style={{ marginLeft: 12 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>展示余额</div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                开启后将显示令牌的余额和使用情况
                            </div>
                        </div>
                    </div>
                </Space>

                <div style={{
                    marginTop: 24,
                    padding: 12,
                    background: '#f7f8fa',
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#666'
                }}>
                    <strong>💡 提示：</strong>保存后需要刷新页面才能生效
                </div>
            </div>
        </Modal>
    );
};

export default SettingsPanel;
