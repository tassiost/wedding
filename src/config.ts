// ============================================================
// WEDDING PHOTO APP - BUILD-TIME CONFIGURATION
// ============================================================
// Fill in your GitHub details below, then rebuild & redeploy.
// This makes the app auto-authenticated for ALL guests —
// they won't need to enter anything. The token gets baked
// into the JavaScript bundle.
//
// SECURITY NOTE: Since your repo is public, this token WILL
// be visible in the source code. The risk is low (repo scope
// only, on a single public repo). After the wedding, revoke
// the token at: https://github.com/settings/tokens
//
// STEP 1: Fill in the values below
// STEP 2: Run: npm run build
// STEP 3: Deploy the dist/ folder to GitHub Pages
// ============================================================

export const BUILT_IN_CONFIG = {
  // Your GitHub Personal Access Token (with 'repo' scope)
  token: import.meta.env.VITE_GITHUB_TOKEN || '',

  // Your GitHub username (or org name)
  repoOwner: 'tassiost',

  // Your repo name (e.g., 'wedding-photos')
  repoName: 'wedding',

  // The branch to save photos to (usually 'main')
  branch: 'main',
};

// Set this to TRUE to disable the Settings page for guests.
// Only do this AFTER you've baked in your config above and
// confirmed it works. When true, the Setup nav link is hidden.
export const HIDE_SETTINGS = true;
