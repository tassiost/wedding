import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppContext';
import { Link } from 'react-router';
import { ImagePlus, Loader2, X, User, Clock, RefreshCw } from 'lucide-react';
import Toast from '@/components/Toast';

export default function Gallery() {
  const { photos, loadPhotos, isLoading, isAuthenticated } = useApp();
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState('');
  const [lightboxMeta, setLightboxMeta] = useState('');
  const [toast, setToast] = useState({ message: '', visible: false });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  // Load photos on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos();
    }
  }, [isAuthenticated]);

  // Poll for new photos every 10 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadPhotos();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadPhotos]);

  // Track photo count changes for toast notifications
  useEffect(() => {
    if (photos.length > photoCount && photoCount > 0) {
      const diff = photos.length - photoCount;
      showToast(`${diff} new photo${diff !== 1 ? 's' : ''} uploaded!`);
    }
    setPhotoCount(photos.length);
  }, [photos.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPhotos();
    setIsRefreshing(false);
    showToast('Gallery refreshed');
  };

  const openLightbox = (photo: typeof photos[0]) => {
    setLightboxPhoto(photo.dataUrl);
    setLightboxCaption(photo.caption);
    setLightboxMeta(`By ${photo.guestName || 'Anonymous'} • ${formatDate(photo.uploadedAt)}`);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
    setLightboxCaption('');
    setLightboxMeta('');
    document.body.style.overflow = '';
  };

  // Close lightbox on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#faf7f2] py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <ImagePlus className="w-16 h-16 text-[#f5e6d3] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#2c2c2c] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              GitHub Not Connected
            </h2>
            <p className="text-[#6b6b6b] text-sm mb-6">
              Connect your GitHub repository to view the photo gallery.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl text-[#2c2c2c]" style={{ fontFamily: 'Georgia, serif' }}>
            Guest Gallery
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[#6b6b6b] text-sm">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-[#f5e6d3] transition-colors disabled:opacity-50"
              title="Refresh gallery"
            >
              <RefreshCw className={`w-4 h-4 text-[#6b6b6b] ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200"
            >
              <ImagePlus className="w-4 h-4" />
              Add Photos
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && photos.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#c9a96e] animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && photos.length === 0 && (
          <div className="text-center py-16">
            <ImagePlus className="w-16 h-16 text-[#f5e6d3] mx-auto mb-4" />
            <h3 className="text-lg text-[#2c2c2c] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              No photos yet
            </h3>
            <p className="text-[#6b6b6b] text-sm mb-6">Be the first to share a moment!</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200"
            >
              <ImagePlus className="w-4 h-4" />
              Upload Photos
            </Link>
          </div>
        )}

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => openLightbox(photo)}
                className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || 'Wedding photo'}
                    loading="lazy"
                    className="w-full h-56 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  {photo.caption && (
                    <p className="text-sm text-[#2c2c2c] mb-1 line-clamp-1">{photo.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[#6b6b6b]">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {photo.guestName || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(photo.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-[1000] bg-black/92 flex items-center justify-center p-4 sm:p-8"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 flex items-center justify-center text-white hover:text-[#c9a96e] transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <img
            src={lightboxPhoto}
            alt="Enlarged photo"
            className="max-w-[90%] max-h-[85vh] object-contain rounded"
            onClick={e => e.stopPropagation()}
          />

          {(lightboxCaption || lightboxMeta) && (
            <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 text-center text-white max-w-xl px-4">
              {lightboxCaption && (
                <h4 className="font-normal text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                  {lightboxCaption}
                </h4>
              )}
              {lightboxMeta && (
                <p className="text-sm opacity-80">{lightboxMeta}</p>
              )}
            </div>
          )}
        </div>
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </main>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
