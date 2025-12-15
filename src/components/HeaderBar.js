import React, { useState } from 'react';
import { Nav, Button, Space, Typography } from '@douyinfe/semi-ui';
import { IconTag } from '@douyinfe/semi-icons-lab';
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
      }}
      className="section-fade"
    >
      <Nav
        mode='horizontal'
        header={
          {
            text: '令牌查询',
            logo: (
              <div style={{ width: '100%', height: '100%' }} className="icon-bounce">
                <IconTag size='large' />
              </div>
            )
          }
        }
      />
      {/* 赞助商信息 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          background: 'var(--semi-color-fill-0)',
          borderRadius: 6,
          cursor: 'pointer',
          marginRight: 'auto',
          marginLeft: 24,
        }}
        onClick={() => window.open('https://api.ikuncode.cc', '_blank')}
      >
        <Space spacing={8}>
          <img
            src={process.env.PUBLIC_URL + '/logo.png'}
            alt="IkunCode"
            style={{ height: 24, width: 24, borderRadius: 4 }}
          />
          <div style={{ lineHeight: 1.2 }}>
            <Text strong style={{ fontSize: 13 }}>IkunCode 中转站</Text>
            <br />
            <Text type="tertiary" style={{ fontSize: 11 }}>赞助开发</Text>
          </div>
        </Space>
      </div>
      <Button
        icon={<IconSetting className="icon-rotate" />}
        theme='borderless'
        onClick={handleSettingsClick}
        style={{ marginRight: 16 }}
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
