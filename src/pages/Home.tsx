import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { useApp } from '@/hooks/useAppContext';
import { Upload, Image, Calendar, MapPin } from 'lucide-react';
import QRCode from 'qrcode';

export default function Home() {
  const { settings, photos } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photosLengthRef = useRef(photos.length);

  const getPhotoUrl = (photo: any) => {
    return photo.r2Url || photo.dataUrl || '';
  };

  useEffect(() => {
    // Generate QR code pointing to the current URL
    const currentUrl = window.location.origin + window.location.pathname.replace(/\/?$/, '/');
    QRCode.toDataURL(currentUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#2c2c2c',
        light: '#faf7f2',
      },
    }).then(setQrDataUrl).catch(console.error);
  }, []);

  // Auto-advance slideshow every 3 seconds
  useEffect(() => {
    photosLengthRef.current = photos.length;
  }, [photos.length]);

  useEffect(() => {
    if (photosLengthRef.current > 0) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex(prev => (prev + 1) % photosLengthRef.current);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#faf7f2]">
      {/* Hero Section */}
      <div className="text-center px-6 pt-12 pb-8 max-w-3xl mx-auto">
        <h1
          className="text-4xl sm:text-5xl text-[#2c2c2c] mb-3 font-normal tracking-tight"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {settings.coupleNames}
        </h1>
        <div className="flex items-center justify-center gap-2 text-[#c9a96e] text-lg font-medium mb-2">
          <Calendar className="w-4 h-4" />
          {settings.weddingDate}
        </div>
        <div className="flex items-center justify-center gap-2 text-[#6b6b6b] text-sm">
          <MapPin className="w-4 h-4" />
          {settings.venue}
        </div>
      </div>

      {/* Photo Slideshow */}
      {photos.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 mb-8">
          <div className="bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <div className="relative aspect-video bg-black">
              <img
                src={getPhotoUrl(photos[currentPhotoIndex])}
                alt={photos[currentPhotoIndex]?.caption || 'Wedding photo'}
                className="w-full h-full object-contain"
              />
              {photos[currentPhotoIndex]?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 text-center">
                  <p className="text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                    {photos[currentPhotoIndex].caption}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 text-center">
              <p className="text-[#6b6b6b] text-sm">
                Photo {currentPhotoIndex + 1} of {photos.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Section */}
      <div className="bg-white rounded-xl p-6 max-w-sm mx-auto text-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR Code to this site"
            className="w-56 h-56 mx-auto rounded-lg mb-3"
          />
        )}
        <p className="text-[#6b6b6b] text-sm">Scan to open on your phone</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-6 pb-12">
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200 hover:-translate-y-0.5"
        >
          <Upload className="w-5 h-5" />
          Upload Photos
        </Link>
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-[#2c2c2c] bg-white border-2 border-[#f5e6d3] hover:border-[#c9a96e] hover:text-[#c9a96e] transition-all duration-200"
        >
          <Image className="w-5 h-5" />
          View Gallery
        </Link>
      </div>

      {/* Instructions */}
      <div className="max-w-lg mx-auto px-6 pb-12">
        <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <h3 className="text-[#2c2c2c] font-semibold mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            How it works
          </h3>
          <ol className="space-y-2 text-[#6b6b6b] text-sm">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              Scan the QR code or share the link with guests
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              Guests upload photos with captions from their phones
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              Photos appear in the gallery in real-time
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              All photos are stored securely on GitHub
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
