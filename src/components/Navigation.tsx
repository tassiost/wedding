import { Link, useLocation } from 'react-router';
import { useApp } from '@/hooks/useAppContext';
import { HIDE_SETTINGS } from '@/config';
import { Camera, Home, Image, Upload, Settings } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();
  const { settings } = useApp();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#f5e6d3] shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[#c9a96e] font-semibold text-xl tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          <Camera className="w-5 h-5" />
          {settings.eventTitle || 'Our Wedding'}
        </Link>

        <ul className="flex items-center gap-4 sm:gap-6 list-none">
          <li>
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/') ? 'text-[#c9a96e]' : 'text-[#6b6b6b] hover:text-[#c9a96e]'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </li>
          <li>
            <Link
              to="/upload"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/upload') ? 'text-[#c9a96e]' : 'text-[#6b6b6b] hover:text-[#c9a96e]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </Link>
          </li>
          <li>
            <Link
              to="/gallery"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/gallery') ? 'text-[#c9a96e]' : 'text-[#6b6b6b] hover:text-[#c9a96e]'
              }`}
            >
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
          </li>
          {!HIDE_SETTINGS && (
            <li>
              <Link
                to="/settings"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/settings') ? 'text-[#c9a96e]' : 'text-[#6b6b6b] hover:text-[#c9a96e]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Setup</span>
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
