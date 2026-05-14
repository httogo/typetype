import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import Practice from './pages/Practice';
import Reading from './pages/Reading';
import Custom from './pages/Custom';
import Articles from './pages/Articles';
import History from './pages/History';

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Practice />} />
            <Route path="reading" element={<Reading />} />
            <Route path="custom" element={<Custom />} />
            <Route path="articles" element={<Articles />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
