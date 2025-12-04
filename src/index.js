import React from 'react';
import ReactDOM from 'react-dom/client';
import { Layout } from '@douyinfe/semi-ui';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import HeaderBar from './components/HeaderBar';
import reportWebVitals from './reportWebVitals';
import 'semantic-ui-css/semantic.min.css';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const { Content, Header } = Layout;
root.render(
  <Layout>
    <Header>
      <HeaderBar />
    </Header>
    <Layout>
      <Content>
        <App />
      </Content>
    </Layout>
    {/* Vercel Analytics - 仅在生产环境启用流量监控 */}
    {process.env.NODE_ENV === 'production' && (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    )}
  </Layout>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
