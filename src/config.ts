// ============================================================
// WEDDING PHOTO APP - BUILD-TIME CONFIGURATION
// ============================================================
// This config is baked into the JavaScript bundle at build time.
// The repoOwner/repoName/branch are used to identify the wedding
// — the actual API calls go to the Cloudflare Worker (set in .env).
//
// The token is no longer needed here — the Worker handles auth
// server-side via its own environment variables.
// ============================================================

export const BUILT_IN_CONFIG = {
  // Token is stored server-side on the Cloudflare Worker
  token: '',

  // Your GitHub username (or org name) — used as an identifier
  repoOwner: 'tassiost',

  // Your repo name
  repoName: 'wedding',

  // The branch (usually 'main')
  branch: 'main',
};

// Set this to TRUE to disable the Settings page for guests.
// When true, the Setup nav link is hidden.
export const HIDE_SETTINGS = true;
