import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import JourneyPage from './pages/JourneyPage';
import ZonesPage from './pages/ZonesPage';
import ReportPage from './pages/ReportPage';
import VendorPage from './pages/VendorPage';
import AdminPage from './pages/AdminPage';
import './styles/globals.css';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/journey" element={<JourneyPage />} />
            <Route path="/zones" element={<ZonesPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/vendor/update" element={<VendorPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
