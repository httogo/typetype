import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';

// 首屏页面保持同步导入（练习页面是默认页面）
import Practice from './pages/Practice';

// 非首屏页面使用 lazy 加载
const Reading = lazy(() => import('./pages/Reading'));
const Articles = lazy(() => import('./pages/Articles'));
const History = lazy(() => import('./pages/History'));
const Vocabulary = lazy(() => import('./pages/Vocabulary'));

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-gray-400">加载中...</span></div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Practice />} />
                <Route path="reading" element={<Reading />} />
                <Route path="articles" element={<Articles />} />
                <Route path="history" element={<History />} />
                <Route path="vocabulary" element={<Vocabulary />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
