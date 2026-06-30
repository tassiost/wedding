import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Photo, WeddingSettings, GitHubConfig } from '@/types';
import { fetchPhotos, savePhotos, uploadPhoto, deletePhoto, verifyToken } from '@/lib/githubApi';
import { BUILT_IN_CONFIG } from '@/config';

interface AppContextType {
  // Settings
  settings: WeddingSettings;
  updateSettings: (settings: Partial<WeddingSettings>) => void;

  // GitHub Config
  githubConfig: GitHubConfig | null;
  setGithubConfig: (config: GitHubConfig | null) => void;
  isAuthenticated: boolean;
  authenticate: (config: GitHubConfig) => Promise<boolean>;

  // Photos
  photos: Photo[];
  loadPhotos: () => Promise<void>;
  addPhoto: (file: File, caption: string, guestName: string) => Promise<void>;
  addPhotos: (files: File[], captions: string[], guestName: string) => Promise<number>;
  removePhoto: (id: string) => Promise<void>;
  isLoading: boolean;
  uploadProgress: number;
}

const defaultSettings: WeddingSettings = {
  coupleNames: 'Victoria & Vincent',
  weddingDate: 'June 26 - 28, 2026',
  venue: 'Canale, Piemonte, Italy',
  eventTitle: "Vivi's Wedding",
  repoOwner: '',
  repoName: '',
  branch: 'main',
};

const STORAGE_KEY_SETTINGS = 'wedding_settings';
const STORAGE_KEY_GITHUB = 'wedding_github_config';

function loadStoredSettings(): WeddingSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...defaultSettings };
}

function loadStoredGithubConfig(): GitHubConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GITHUB);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WeddingSettings>(loadStoredSettings);
  const [githubConfig, setGithubConfigState] = useState<GitHubConfig | null>(loadStoredGithubConfig);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Auto-authenticate with built-in config (works on ALL devices)
  useEffect(() => {
    const hasBuiltInConfig =
      BUILT_IN_CONFIG.repoOwner &&
      BUILT_IN_CONFIG.repoName;

    if (hasBuiltInConfig) {
      const config: GitHubConfig = {
        token: '', // Token is now server-side
        repoOwner: BUILT_IN_CONFIG.repoOwner,
        repoName: BUILT_IN_CONFIG.repoName,
        branch: BUILT_IN_CONFIG.branch || 'main',
      };
      // Backend handles authentication, so we auto-authenticate
      setGithubConfigState(config);
      setIsAuthenticated(true);
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<WeddingSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setGithubConfig = useCallback((config: GitHubConfig | null) => {
    setGithubConfigState(config);
    if (config) {
      localStorage.setItem(STORAGE_KEY_GITHUB, JSON.stringify(config));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem(STORAGE_KEY_GITHUB);
      setIsAuthenticated(false);
    }
  }, []);

  const authenticate = useCallback(async (config: GitHubConfig): Promise<boolean> => {
    const valid = await verifyToken(config);
    if (valid) {
      setGithubConfig(config);
      setIsAuthenticated(true);
    }
    return valid;
  }, [setGithubConfig]);

  const loadPhotos = useCallback(async () => {
    if (!githubConfig) return;
    setIsLoading(true);
    try {
      const fetched = await fetchPhotos(githubConfig);
      setPhotos(fetched);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [githubConfig]);

  const addPhoto = useCallback(async (file: File, caption: string, guestName: string) => {
    if (!githubConfig) throw new Error('Not authenticated');
    setIsLoading(true);
    setUploadProgress(0);
    try {
      const photo = await uploadPhoto(githubConfig, file, caption, guestName);
      setPhotos(prev => [photo, ...prev]);
      setUploadProgress(100);
    } finally {
      setIsLoading(false);
    }
  }, [githubConfig]);

  const addPhotos = useCallback(async (
    files: File[],
    captions: string[],
    guestName: string,
    onPhotoProgress?: (fileName: string, status: 'success' | 'failed') => void,
    metadataList?: any[]
  ) => {
    if (!githubConfig) throw new Error('Not authenticated');
    setIsLoading(true);
    setUploadProgress(0);
    try {
      const newPhotos: Photo[] = [];
      const failedFiles: string[] = [];

      for (let i = 0; i < files.length; i++) {
        try {
          const file = files[i];
          const metadata = metadataList?.[i] || {};
          const photo = await uploadPhoto(githubConfig, file, captions[i] || '', guestName || 'Anonymous', metadata);
          newPhotos.push(photo);
          if (onPhotoProgress) {
            onPhotoProgress(file.name, 'success');
          }
        } catch (error) {
          console.error(`Failed to upload ${files[i].name}:`, error);
          failedFiles.push(files[i].name);
          if (onPhotoProgress) {
            onPhotoProgress(files[i].name, 'failed');
          }
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setPhotos(prev => [...newPhotos, ...prev]);
      return { successCount: newPhotos.length, failedFiles };
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [githubConfig]);

  const removePhoto = useCallback(async (id: string) => {
    if (!githubConfig) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      await deletePhoto(githubConfig, id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, [githubConfig]);

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        githubConfig,
        setGithubConfig,
        isAuthenticated,
        authenticate,
        photos,
        loadPhotos,
        addPhoto,
        addPhotos,
        removePhoto,
        isLoading,
        uploadProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
