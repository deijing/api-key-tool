import React, { useEffect, useState } from 'react';
import Log from "./pages/Log";
import ShareTokenView from './components/ShareTokenView';
import { decodeShareData } from './helpers/utils';
import './App.css';

function App() {
    const [shareData, setShareData] = useState(null);
    const [shareVisible, setShareVisible] = useState(false);

    // 检测URL中的分享参数
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const shareParam = params.get('share');
        if (shareParam) {
            const decoded = decodeShareData(shareParam);
            if (decoded) {
                setShareData(decoded);
                setShareVisible(true);
            } else {
                // 分享参数无效，清除URL参数
                const { origin, pathname } = window.location;
                window.history.replaceState(null, '', `${origin}${pathname}`);
            }
        }
    }, []);

    // 关闭分享视图
    const handleCloseShare = () => {
        setShareVisible(false);
        setShareData(null);
        // 清除URL中的分享参数
        const { origin, pathname } = window.location;
        window.history.replaceState(null, '', `${origin}${pathname}`);
    };

    return (
        <div className="App-body page-fade-in">
            <Log />
            <ShareTokenView
                visible={shareVisible}
                shareData={shareData}
                onClose={handleCloseShare}
            />
        </div>
    );
}

export default App;
