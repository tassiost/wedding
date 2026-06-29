import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '@/hooks/useAppContext';
import { UploadCloud, X, User, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import imageCompression from 'browser-image-compression';

interface PreviewFile {
  file: File;
  preview: string;
  caption: string;
}

export default function Upload() {
  const { isAuthenticated, addPhotos } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem('weddingGuestName') || '';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addPreviews(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    addPreviews(files);
    e.target.value = '';
  }, []);

  const addPreviews = (files: File[]) => {
    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreview = (index: number) => {
    setPreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setPreviews(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption };
      return updated;
    });
  };

  const handleGuestNameChange = (name: string) => {
    setGuestName(name);
    localStorage.setItem('weddingGuestName', name);
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;
    if (!isAuthenticated) {
      showToast('Please connect GitHub in Settings first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Compress images before upload
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      setUploadProgress(10);
      const compressedFiles = await Promise.all(
        previews.map(async (p) => {
          try {
            const compressed = await imageCompression(p.file, compressionOptions);
            return compressed;
          } catch (error) {
            console.error('Compression failed for', p.file.name, error);
            return p.file; // Fallback to original if compression fails
          }
        })
      );

      setUploadProgress(30);
      const captions = previews.map(p => p.caption);
      const result = await addPhotos(compressedFiles, captions, guestName);

      setUploadProgress(100);

      // Clean up preview URLs
      previews.forEach(p => URL.revokeObjectURL(p.preview));
      setPreviews([]);

      if (result.failedFiles.length > 0) {
        showToast(`Uploaded ${result.successCount} photo${result.successCount !== 1 ? 's' : ''}. Failed: ${result.failedFiles.join(', ')}`);
      } else {
        showToast(`Uploaded ${result.successCount} photo${result.successCount !== 1 ? 's' : ''}!`);
      }

      setTimeout(() => {
        navigate('/gallery', { state: { refresh: true } });
      }, 1500);
    } catch (error) {
      console.error('Upload failed:', error);
      showToast('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#faf7f2] py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <UploadCloud className="w-16 h-16 text-[#f5e6d3] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#2c2c2c] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              GitHub Not Connected
            </h2>
            <p className="text-[#6b6b6b] text-sm mb-6">
              To upload photos, you need to connect your GitHub repository first.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-2xl text-[#2c2c2c] mb-6 text-center"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Share Your Moments
        </h2>

        {/* Guest Name Input */}
        <div className="relative max-w-sm mx-auto mb-4">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b6b]" />
          <input
            type="text"
            value={guestName}
            onChange={e => handleGuestNameChange(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
          />
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center bg-white transition-all duration-200 cursor-pointer mb-6 ${
            isDragging
              ? 'border-[#c9a96e] bg-[#faf7f2]'
              : 'border-[#f5e6d3] hover:border-[#c9a96e] hover:bg-[#faf7f2]'
          }`}
        >
          <UploadCloud className="w-12 h-12 text-[#c9a96e] mx-auto mb-3" />
          <h3 className="text-lg text-[#2c2c2c] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Drop photos here
          </h3>
          <p className="text-[#6b6b6b] text-sm">
            or click to browse (up to 20 images, 10MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="w-full h-1.5 bg-[#f5e6d3] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-[#c9a96e] transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Preview Grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
              >
                <img
                  src={preview.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <input
                  type="text"
                  value={preview.caption}
                  onChange={e => updateCaption(index, e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-2 py-1.5 text-xs border-t border-[#f5e6d3] bg-white text-[#2c2c2c] focus:outline-none focus:bg-[#faf7f2]"
                  onClick={e => e.stopPropagation()}
                />
                <button
                  onClick={() => removePreview(index)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {previews.length > 0 && (
          <div className="text-center">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  Upload {previews.length} Photo{previews.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </main>
  );
}
