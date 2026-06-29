import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppContext';
import { Link, useNavigate, useLocation } from 'react-router';
import { ImagePlus, Loader2, X, User, Clock, RefreshCw, Download, ChevronLeft, ChevronRight, Heart, MessageCircle, Grid, LayoutTemplate, Calendar } from 'lucide-react';
import Toast from '@/components/Toast';
import { likePhoto, addComment as addCommentApi } from '@/lib/githubApi';

export default function Gallery() {
  const { photos, loadPhotos, isLoading, isAuthenticated, githubConfig } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState('');
  const [lightboxMeta, setLightboxMeta] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGuest, setFilterGuest] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [layout, setLayout] = useState<'grid' | 'masonry' | 'timeline'>('grid');
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  // Load photos on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos();
    }
  }, [isAuthenticated]);

  // Refresh photos when coming from upload page
  useEffect(() => {
    if (location.state?.refresh && isAuthenticated) {
      loadPhotos();
      // Clear the state to prevent infinite refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isAuthenticated, navigate, location.pathname]);

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
  }, [photos.length, photoCount]);

  // Slideshow auto-advance
  useEffect(() => {
    if (isSlideshow && lightboxPhoto !== null) {
      const interval = setInterval(() => {
        nextPhoto();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isSlideshow, lightboxPhoto]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPhotos();
    setIsRefreshing(false);
    showToast('Gallery refreshed');
  };

  const openLightbox = (photo: typeof photos[0], index: number) => {
    setLightboxPhoto(getPhotoUrl(photo));
    setLightboxCaption(photo.caption);
    setLightboxMeta(`By ${photo.guestName || 'Anonymous'} • ${formatDate(photo.uploadedAt)}`);
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
    setLightboxCaption('');
    setLightboxMeta('');
    setLightboxIndex(0);
    setIsSlideshow(false);
    setShowComments(false);
    document.body.style.overflow = '';
  };

  const nextPhoto = () => {
    const filtered = getFilteredPhotos();
    if (filtered.length === 0) return;
    const nextIndex = (lightboxIndex + 1) % filtered.length;
    const photo = filtered[nextIndex];
    setLightboxPhoto(getPhotoUrl(photo));
    setLightboxCaption(photo.caption);
    setLightboxMeta(`By ${photo.guestName || 'Anonymous'} • ${formatDate(photo.uploadedAt)}`);
    setLightboxIndex(nextIndex);
  };

  const prevPhoto = () => {
    const filtered = getFilteredPhotos();
    if (filtered.length === 0) return;
    const prevIndex = (lightboxIndex - 1 + filtered.length) % filtered.length;
    const photo = filtered[prevIndex];
    setLightboxPhoto(getPhotoUrl(photo));
    setLightboxCaption(photo.caption);
    setLightboxMeta(`By ${photo.guestName || 'Anonymous'} • ${formatDate(photo.uploadedAt)}`);
    setLightboxIndex(prevIndex);
  };

  const toggleLike = async (photoId: string) => {
    if (!githubConfig || isLiking) return;
    setIsLiking(true);
    try {
      const guestName = localStorage.getItem('weddingGuestName') || 'Anonymous';
      await likePhoto(githubConfig, photoId, guestName);
      // Reload photos without triggering upload toast
      const currentCount = photos.length;
      await loadPhotos();
      setPhotoCount(currentCount); // Prevent false upload toast
    } catch (error) {
      console.error('Failed to like photo:', error);
      showToast('Failed to like photo');
    } finally {
      setIsLiking(false);
    }
  };

  const addComment = async (photoId: string, text: string) => {
    if (!text.trim() || !githubConfig || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const guestName = localStorage.getItem('weddingGuestName') || 'Anonymous';
      await addCommentApi(githubConfig, photoId, text, guestName);
      // Reload photos without triggering upload toast
      const currentCount = photos.length;
      await loadPhotos();
      setPhotoCount(currentCount); // Prevent false upload toast
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      showToast('Failed to add comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const getFilteredPhotos = () => {
    return photos.filter(photo => {
      const matchesSearch = !searchQuery ||
        photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.guestName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGuest = !filterGuest || photo.guestName === filterGuest;
      const matchesDate = !filterDate || photo.uploadedAt.startsWith(filterDate);
      return matchesSearch && matchesGuest && matchesDate;
    });
  };

  const getUniqueGuests = () => {
    return Array.from(new Set(photos.map(p => p.guestName).filter(Boolean)));
  };

  const getUniqueDates = () => {
    return Array.from(new Set(photos.map(p => p.uploadedAt.split('T')[0]))).sort().reverse();
  };

  const getStorageUsage = () => {
    const totalBytes = photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);
    const mb = totalBytes / (1024 * 1024);
    if (mb < 1) {
      const kb = (totalBytes / 1024).toFixed(2);
      return `${kb} KB`;
    }
    return mb.toFixed(2) + ' MB';
  };

  const getPhotoUrl = (photo: Photo) => {
    return photo.r2Url || photo.dataUrl || '';
  };

  const downloadPhoto = (photo: Photo, filename: string) => {
    const link = document.createElement('a');
    link.href = getPhotoUrl(photo);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLikedByUser = (photo: typeof photos[0]) => {
    const guestName = localStorage.getItem('weddingGuestName') || 'Anonymous';
    return photo.likedBy?.includes(guestName) || false;
  };

  // Close lightbox on escape key, navigate with arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (lightboxPhoto !== null) {
        if (e.key === 'ArrowRight') nextPhoto();
        if (e.key === 'ArrowLeft') prevPhoto();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhoto]);

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

  const filteredPhotos = getFilteredPhotos();

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
              {filteredPhotos.length} of {photos.length} photos
            </span>
            <span className="text-[#6b6b6b] text-sm">
              • {getStorageUsage()}
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

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-6">
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search photos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border-2 border-[#f5e6d3] rounded-lg text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
            />
            <select
              value={filterGuest}
              onChange={e => setFilterGuest(e.target.value)}
              className="px-4 py-2 border-2 border-[#f5e6d3] rounded-lg text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
            >
              <option value="">All Guests</option>
              {getUniqueGuests().map(guest => (
                <option key={guest} value={guest}>{guest}</option>
              ))}
            </select>
            <select
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-4 py-2 border-2 border-[#f5e6d3] rounded-lg text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
            >
              <option value="">All Dates</option>
              {getUniqueDates().map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 border-2 border-[#f5e6d3] rounded-lg p-1">
              <button
                onClick={() => setLayout('grid')}
                className={`p-2 rounded-md transition-colors ${layout === 'grid' ? 'bg-[#c9a96e] text-white' : 'text-[#6b6b6b] hover:bg-[#f5e6d3]'}`}
                title="Grid layout"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('masonry')}
                className={`p-2 rounded-md transition-colors ${layout === 'masonry' ? 'bg-[#c9a96e] text-white' : 'text-[#6b6b6b] hover:bg-[#f5e6d3]'}`}
                title="Masonry layout"
              >
                <LayoutTemplate className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('timeline')}
                className={`p-2 rounded-md transition-colors ${layout === 'timeline' ? 'bg-[#c9a96e] text-white' : 'text-[#6b6b6b] hover:bg-[#f5e6d3]'}`}
                title="Timeline layout"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
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
        {filteredPhotos.length > 0 && (
          <>
            {layout === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => openLightbox(photo, index)}
                    className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={getPhotoUrl(photo)}
                        alt={photo.caption || 'Wedding photo'}
                        loading="lazy"
                        className="w-full h-56 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLike(photo.id); }}
                          className={`p-1.5 rounded-full ${isLikedByUser(photo) ? 'bg-red-500 text-white' : 'bg-white/90 text-[#2c2c2c]'} transition-colors`}
                        >
                          <Heart className={`w-4 h-4 ${isLikedByUser(photo) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
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
                      <div className="flex items-center gap-2 mt-2 text-xs text-[#6b6b6b]">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {photo.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {(photo.comments || []).length}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {layout === 'masonry' && (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => openLightbox(photo, index)}
                    className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg break-inside-avoid"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={getPhotoUrl(photo)}
                        alt={photo.caption || 'Wedding photo'}
                        loading="lazy"
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ maxHeight: '400px' }}
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLike(photo.id); }}
                          className={`p-1.5 rounded-full ${isLikedByUser(photo) ? 'bg-red-500 text-white' : 'bg-white/90 text-[#2c2c2c]'} transition-colors`}
                        >
                          <Heart className={`w-4 h-4 ${isLikedByUser(photo) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
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

            {layout === 'timeline' && (
              <div className="space-y-6">
                {getUniqueDates().map(date => (
                  <div key={date}>
                    <h3 className="text-lg text-[#2c2c2c] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                      {date}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredPhotos
                        .filter(photo => photo.uploadedAt.startsWith(date))
                        .map((photo, index) => (
                          <div
                            key={photo.id}
                            onClick={() => openLightbox(photo, filteredPhotos.indexOf(photo))}
                            className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                          >
                            <div className="relative overflow-hidden">
                              <img
                                src={getPhotoUrl(photo)}
                                alt={photo.caption || 'Wedding photo'}
                                loading="lazy"
                                className="w-full h-56 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleLike(photo.id); }}
                                  className={`p-1.5 rounded-full ${isLikedByUser(photo) ? 'bg-red-500 text-white' : 'bg-white/90 text-[#2c2c2c]'} transition-colors`}
                                >
                                  <Heart className={`w-4 h-4 ${isLikedByUser(photo) ? 'fill-current' : ''}`} />
                                </button>
                              </div>
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-4 sm:p-8"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 flex items-center justify-center text-white hover:text-[#c9a96e] transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-[#c9a96e] transition-colors z-10"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-[#c9a96e] transition-colors z-10"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Action buttons */}
          <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex gap-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); downloadPhoto(filteredPhotos[lightboxIndex], `wedding-photo-${lightboxIndex}.jpg`); }}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-[#c9a96e] transition-colors"
              title="Download photo"
            >
              <Download className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsSlideshow(!isSlideshow); }}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${isSlideshow ? 'text-[#c9a96e]' : 'text-white hover:text-[#c9a96e]'}`}
              title="Toggle slideshow"
            >
              <RefreshCw className={`w-6 h-6 ${isSlideshow ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike(filteredPhotos[lightboxIndex]?.id || ''); }}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${isLikedByUser(filteredPhotos[lightboxIndex]) ? 'text-red-500' : 'text-white hover:text-red-500'}`}
              title="Like photo"
            >
              <Heart className={`w-6 h-6 ${isLikedByUser(filteredPhotos[lightboxIndex]) ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${showComments ? 'text-[#c9a96e]' : 'text-white hover:text-[#c9a96e]'}`}
              title="Show comments"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          </div>

          <img
            src={lightboxPhoto}
            alt="Enlarged photo"
            className="max-w-[90%] max-h-[85vh] object-contain rounded transition-all duration-300"
            onClick={e => e.stopPropagation()}
          />

          {/* Photo info */}
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

          {/* Comments panel */}
          {showComments && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-black/95 p-4 sm:p-6 max-h-[40vh] overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto">
                <h3 className="text-white text-lg mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  Comments {(filteredPhotos[lightboxIndex]?.comments || []).length}
                </h3>
                <div className="space-y-3 mb-4">
                  {(filteredPhotos[lightboxIndex]?.comments || []).map((comment: any) => (
                    <div key={comment.id} className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-semibold text-sm">{comment.author}</span>
                        <span className="text-white/60 text-xs">{formatDate(comment.timestamp)}</span>
                      </div>
                      <p className="text-white/90 text-sm">{comment.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment(filteredPhotos[lightboxIndex]?.id || '', newComment)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
                  />
                  <button
                    onClick={() => addComment(filteredPhotos[lightboxIndex]?.id || '', newComment)}
                    disabled={isPostingComment}
                    className="px-4 py-2 bg-[#c9a96e] text-white rounded-lg hover:bg-[#b8995e] transition-colors disabled:opacity-50"
                  >
                    {isPostingComment ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
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
