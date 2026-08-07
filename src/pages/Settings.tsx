import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppContext';
import { Heart, Check } from 'lucide-react';
import Toast from '@/components/Toast';

export default function Settings() {
  const { settings, updateSettings, isAuthenticated } = useApp();

  const [form, setForm] = useState({
    coupleNames: settings.coupleNames,
    weddingDate: settings.weddingDate,
    venue: settings.venue,
    eventTitle: settings.eventTitle,
  });

  const [toast, setToast] = useState({ message: '', visible: false });

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      coupleNames: settings.coupleNames,
      weddingDate: settings.weddingDate,
      venue: settings.venue,
      eventTitle: settings.eventTitle,
    }));
  }, [settings]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  const handleSaveWedding = () => {
    updateSettings({
      coupleNames: form.coupleNames,
      weddingDate: form.weddingDate,
      venue: form.venue,
      eventTitle: form.eventTitle,
    });
    showToast('Wedding details saved!');
  };

  return (
    <main className="min-h-screen bg-[#faf7f2] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl text-[#2c2c2c] mb-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Setup
          </h1>
          <p className="text-[#6b6b6b] text-sm">Configure your wedding gallery</p>
        </div>

        {/* Wedding Details Card */}
        <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-[#c9a96e]" />
            <h2 className="text-lg font-semibold text-[#2c2c2c]">Wedding Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Couple Names</label>
              <input
                type="text"
                value={form.coupleNames}
                onChange={e => setForm(prev => ({ ...prev, coupleNames: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="Alex & Jordan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Wedding Date</label>
              <input
                type="text"
                value={form.weddingDate}
                onChange={e => setForm(prev => ({ ...prev, weddingDate: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="June 28, 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Venue</label>
              <input
                type="text"
                value={form.venue}
                onChange={e => setForm(prev => ({ ...prev, venue: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="Rosewood Gardens"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Event Title</label>
              <input
                type="text"
                value={form.eventTitle}
                onChange={e => setForm(prev => ({ ...prev, eventTitle: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="Our Wedding"
              />
            </div>

            <button
              onClick={handleSaveWedding}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200"
            >
              <Check className="w-4 h-4" />
              Save Wedding Details
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <h3 className="text-sm font-semibold text-[#2c2c2c] mb-2">About Storage</h3>
          <p className="text-xs text-[#6b6b6b] leading-relaxed">
            Photos and videos are stored in Cloudflare R2 (10GB free tier). All API calls go
            through a Cloudflare Worker — no external services. Each photo is compressed before
            upload to save space. Max upload size: 100MB per file.
          </p>
          {isAuthenticated && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Connected and ready to upload
            </p>
          )}
        </div>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </main>
  );
}
