# Tech Stack

- Node.js 20, Tailwind CSS v3.4.19, Vite v7.2.4
- React 19 + TypeScript
- Tailwind CSS with shadcn theme
- Cloudflare Worker (backend) + R2 (storage) + Pages (hosting)

## Components (40+)

accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb,
button-group, button, calendar, card, carousel, chart, checkbox, collapsible,
command, context-menu, dialog, drawer, dropdown-menu, empty, field, form,
hover-card, input-group, input-otp, input, item, kbd, label, menubar,
navigation-menu, pagination, popover, progress, radio-group, resizable,
scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner,
spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

## Usage

```js
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
```

## Structure

```
src/
  components/        UI components (shadcn/ui + custom)
  components/ui/     shadcn/ui primitives
  hooks/             Custom hooks (useAppContext)
  lib/               API client (githubApi.ts), metadata extraction
  pages/             Gallery, Upload, Home, Settings
  types/             TypeScript type definitions
  App.tsx            Root component with routes
  App.css            App-specific styles
  index.css          Global styles
  main.tsx           Entry point (registers Service Worker)

public/
  sw.js              Service Worker (streaming zip downloads)

worker/
  src/index.js       Cloudflare Worker (all API endpoints)
  wrangler.toml      Worker config (R2 binding, env vars)
  DEPLOY.md          Worker deployment guide

docs/                Built frontend (output of `npm run build`)
server/              Legacy Express backend (no longer used)
data/                Legacy metadata files (now stored in R2)
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Build frontend to docs/
npx wrangler deploy  # Deploy Worker (from worker/)
npx wrangler pages deploy docs --project-name vivi-wedding --branch main  # Deploy frontend
```
