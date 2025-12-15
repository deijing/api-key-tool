import React, { useState } from 'react';
import { Button, Space, Typography } from '@douyinfe/semi-ui';
import { IconSetting } from '@douyinfe/semi-icons';
import SettingsPanel from './SettingsPanel';

const { Text } = Typography;

const HeaderBar = () => {
  const [settingsVisible, setSettingsVisible] = useState(false);

  const handleSettingsClick = () => {
    setSettingsVisible(true);
  };

  const handleSettingsClose = () => {
    setSettingsVisible(false);
  };

  const handleConfigChange = () => {
    // 配置更改后的处理（可以在这里添加刷新提示等）
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '8px 16px',
        minHeight: 56,
      }}
      className="section-fade"
    >
      {/* 左侧：Logo + 标题 + 赞助信息 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
        onClick={() => window.open('https://api.ikuncode.cc', '_blank')}
      >
        <Space spacing={12}>
          <img
            src={process.env.PUBLIC_URL + '/logo.png'}
            alt="API Key Tool"
            style={{ height: 40, width: 40, borderRadius: 8 }}
          />
          <div style={{ lineHeight: 1.4 }}>
            <Text strong style={{ fontSize: 18, color: 'var(--semi-color-primary)' }}>API Key Tool</Text>
            <br />
            <Text type="tertiary" style={{ fontSize: 12 }}>由 IkunCode 赞助开发</Text>
          </div>
        </Space>
      </div>

      {/* 右侧：设置按钮 */}
      <Button
        icon={<IconSetting className="icon-rotate" />}
        theme='borderless'
        onClick={handleSettingsClick}
        className="btn-ghost"
      >
        设置
      </Button>
      <SettingsPanel
        visible={settingsVisible}
        onClose={handleSettingsClose}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
};

export default HeaderBar;
