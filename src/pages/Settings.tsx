import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppContext';
import { Save, Github, Heart, Check, AlertCircle, Code2 } from 'lucide-react';
import Toast from '@/components/Toast';

export default function Settings() {
  const { settings, updateSettings, authenticate, isAuthenticated } = useApp();

  const [form, setForm] = useState({
    coupleNames: settings.coupleNames,
    weddingDate: settings.weddingDate,
    venue: settings.venue,
    eventTitle: settings.eventTitle,
    token: '',
    repoOwner: settings.repoOwner || '',
    repoName: settings.repoName || '',
    branch: settings.branch || 'main',
  });

  const [toast, setToast] = useState({ message: '', visible: false });
  const [authStatus, setAuthStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      coupleNames: settings.coupleNames,
      weddingDate: settings.weddingDate,
      venue: settings.venue,
      eventTitle: settings.eventTitle,
      repoOwner: settings.repoOwner || prev.repoOwner,
      repoName: settings.repoName || prev.repoName,
      branch: settings.branch || prev.branch,
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

  const handleSaveGitHub = async () => {
    if (!form.token || !form.repoOwner || !form.repoName) {
      showToast('Please fill in all GitHub fields');
      return;
    }

    setAuthStatus('checking');
    const config = {
      token: form.token,
      repoOwner: form.repoOwner,
      repoName: form.repoName,
      branch: form.branch || 'main',
    };

    const valid = await authenticate(config);
    if (valid) {
      updateSettings({
        repoOwner: form.repoOwner,
        repoName: form.repoName,
        branch: form.branch || 'main',
      });
      setAuthStatus('success');
      showToast('GitHub connected successfully!');
      setForm(prev => ({ ...prev, token: '' }));
    } else {
      setAuthStatus('error');
      showToast('Invalid GitHub token or repository');
    }
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
          <p className="text-[#6b6b6b] text-sm">Configure your wedding photo gallery</p>
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
              <Save className="w-4 h-4" />
              Save Wedding Details
            </button>
          </div>
        </div>

        {/* RECOMMENDED: Built-in Config */}
        <div className="bg-gradient-to-br from-[#c9a96e]/10 to-[#f5e6d3]/30 rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#c9a96e]/30">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-5 h-5 text-[#c9a96e]" />
            <h2 className="text-lg font-semibold text-[#2c2c2c]">Recommended: Build-Time Config</h2>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#c9a96e] bg-[#c9a96e]/10 px-2 py-1 rounded-full">
              Best for guests
            </span>
          </div>

          <p className="text-sm text-[#6b6b6b] mb-4">
            To let guests upload <strong>without any setup</strong>, bake your GitHub token directly into the app code. Then every device is automatically connected.
          </p>

          <ol className="space-y-2 text-sm text-[#2c2c2c] mb-4">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
              Open <code className="bg-white px-1.5 py-0.5 rounded text-xs">src/config.ts</code> in this project
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
              Fill in your <strong>token</strong>, <strong>repoOwner</strong> (your GitHub username), and <strong>repoName</strong>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
              Set <code className="bg-white px-1.5 py-0.5 rounded text-xs">HIDE_SETTINGS: true</code> to hide the Setup tab from guests
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
              Run <code className="bg-white px-1.5 py-0.5 rounded text-xs">npm run build</code> and redeploy
            </li>
          </ol>

          <div className="bg-[#2c2c2c] rounded-lg p-3 text-xs font-mono text-[#f5e6d3] overflow-x-auto">
            <div className="text-[#6b6b6b] mb-1">// src/config.ts</div>
            <div className="text-green-400">export const BUILT_IN_CONFIG = {'{'}</div>
            <div className="pl-4">token: <span className="text-yellow-300">&quot;ghp_YOUR_TOKEN_HERE&quot;</span>,</div>
            <div className="pl-4">repoOwner: <span className="text-yellow-300">&quot;your-username&quot;</span>,</div>
            <div className="pl-4">repoName: <span className="text-yellow-300">&quot;wedding-photos&quot;</span>,</div>
            <div className="pl-4">branch: <span className="text-yellow-300">&quot;main&quot;</span>,</div>
            <div className="text-green-400">{'}'}</div>
            <div className="text-green-400 mt-1">export const HIDE_SETTINGS = <span className="text-yellow-300">true</span>;</div>
          </div>
        </div>

        {/* GitHub Configuration Card */}
        <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-4">
            <Github className="w-5 h-5 text-[#c9a96e]" />
            <h2 className="text-lg font-semibold text-[#2c2c2c]">Quick Test (This Device Only)</h2>
            {isAuthenticated && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Check className="w-3 h-3" />
                Connected
              </span>
            )}
          </div>

          <div className="bg-[#faf7f2] rounded-lg p-4 mb-4 text-sm text-[#6b6b6b]">
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#c9a96e] flex-shrink-0 mt-0.5" />
              This only saves to <strong>this browser</strong>. Use the build-time config above to make it work for everyone. Create a{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Wedding%20Photo%20Gallery"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c9a96e] underline"
              >
                personal access token
              </a>{' '}
              with <strong>repo</strong> scope.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">
                Personal Access Token {isAuthenticated && '(already saved)'}
              </label>
              <input
                type="password"
                value={form.token}
                onChange={e => {
                  setForm(prev => ({ ...prev, token: e.target.value }));
                  setAuthStatus('idle');
                }}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Repository Owner</label>
              <input
                type="text"
                value={form.repoOwner}
                onChange={e => setForm(prev => ({ ...prev, repoOwner: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="your-github-username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Repository Name</label>
              <input
                type="text"
                value={form.repoName}
                onChange={e => setForm(prev => ({ ...prev, repoName: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="wedding-photos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6b6b] mb-1">Branch</label>
              <input
                type="text"
                value={form.branch}
                onChange={e => setForm(prev => ({ ...prev, branch: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-[#f5e6d3] rounded-xl text-[#2c2c2c] bg-white focus:outline-none focus:border-[#c9a96e] transition-colors"
                placeholder="main"
              />
            </div>

            <button
              onClick={handleSaveGitHub}
              disabled={authStatus === 'checking'}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-[#2c2c2c] hover:bg-[#c9a96e] transition-all duration-200 disabled:opacity-50"
            >
              {authStatus === 'checking' ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#f5e6d3] border-t-[#c9a96e] rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" />
                  Connect to GitHub (This Browser Only)
                </>
              )}
            </button>

            {authStatus === 'error' && (
              <p className="text-red-500 text-sm text-center">
                Invalid token or repository. Please check your settings.
              </p>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <h3 className="text-sm font-semibold text-[#2c2c2c] mb-2">About Storage</h3>
          <p className="text-xs text-[#6b6b6b] leading-relaxed">
            Photos are stored as base64 data in a JSON file (<code className="bg-[#faf7f2] px-1 py-0.5 rounded">data/photos.json</code>) in your GitHub repo. 
            This keeps everything in one place with full version history. Each photo is typically 1-3MB when base64 encoded. 
            GitHub has a 100MB file limit and 1GB repo soft limit. For large galleries, consider downloading and archiving periodically.
          </p>
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
