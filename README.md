# Eser's TanStack Start Boilerplate

A minimal, type-safe full-stack React starter template with modern tooling.

## Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TanStack Start** - Full-stack React framework
- **TanStack Router** - Type-safe file-based routing
- **TypeScript 5.9** - Strict mode enabled

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Beautifully designed components
- **Base UI** - Unstyled, accessible primitives from MUI
- **Dark Mode** - System-aware theme switching

### Backend
- **Nitro** - Universal server engine
- **Server Functions** - Type-safe RPC-style server calls

### Build & Dev
- **Vite + Rolldown** - Lightning-fast builds
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Production Deployment

This project reads the frontend API base URL from `VITE_API_BASE_URL`.

- Default production file: `.env.production`
- Current production API value: `https://app3.kualifai.com/api`

### One-command deploy script (recommended)

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh --domain YOUR_DOMAIN --email YOUR_EMAIL
```

Optional flags:
- `--api-url https://app3.kualifai.com/api`
- `--with-www`
- `--skip-certbot`

What the script does:
- Writes `.env.production` with your API URL
- Runs `pnpm install --frozen-lockfile` and `pnpm build`
- Installs/uses PM2 and starts `hadyaa-admin-panel`
- Installs/configures Nginx reverse proxy
- Issues HTTPS certs via Certbot (unless `--skip-certbot`)

### PM2 + Nginx + HTTPS

1. Install runtime tools on server:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

2. Build and start app with PM2:

```bash
pnpm install --frozen-lockfile
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

3. Configure Nginx reverse proxy:

```bash
sudo cp deploy/nginx/hadyaa-admin.conf /etc/nginx/sites-available/hadyaa-admin
sudo ln -s /etc/nginx/sites-available/hadyaa-admin /etc/nginx/sites-enabled/hadyaa-admin
sudo nginx -t
sudo systemctl reload nginx
```

Before reloading Nginx, edit `/etc/nginx/sites-available/hadyaa-admin` and replace:
- `YOUR_DOMAIN`
- `www.YOUR_DOMAIN`

4. Enable HTTPS certificate:

```bash
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

5. Useful PM2 commands:

```bash
pm2 status
pm2 logs hadyaa-admin-panel
pm2 restart hadyaa-admin-panel
```

## Project Structure

```
src/
  components/       # React components
    ui/             # shadcn/ui components (Base UI primitives)
  lib/              # Utility functions
  routes/           # File-based routing (TanStack Router)
  server/           # Server functions (Nitro)
  styles.css        # Global styles & Tailwind config
```

## Features

- Type-safe routing with automatic route generation
- Server functions with full TypeScript inference
- Dark/Light/System theme support
- Accessible UI components out of the box
- SSR with hydration
- Fast refresh in development
