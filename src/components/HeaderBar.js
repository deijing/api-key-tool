import React, { useState } from 'react';
import { Nav, Button } from '@douyinfe/semi-ui';
import { IconTag } from '@douyinfe/semi-icons-lab';
import { IconSetting } from '@douyinfe/semi-icons';
import SettingsPanel from './SettingsPanel';

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
