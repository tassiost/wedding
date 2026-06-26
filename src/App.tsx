import { Routes, Route } from 'react-router';
import { AppProvider } from '@/hooks/useAppContext';
import Navigation from '@/components/Navigation';
import Home from '@/pages/Home';
import Upload from '@/pages/Upload';
import Gallery from '@/pages/Gallery';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppProvider>
  );
}
