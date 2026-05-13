import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import Practice from './pages/Practice';
import Custom from './pages/Custom';
import History from './pages/History';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Practice />} />
            <Route path="custom" element={<Custom />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
