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

- Default API value: `https://app3.kualifai.com/api`

### Fully Dockerized deployment (recommended)

1. Ensure DNS already points your domain to the server IP and ports `80/443` are open.
2. Run the deploy script:

```bash
chmod +x scripts/deploy-production-docker.sh
./scripts/deploy-production-docker.sh --domain YOUR_DOMAIN --email YOUR_EMAIL
```

Optional flags:
- `--api-url https://app3.kualifai.com/api`
- `--with-www`

What this script does:
- Generates `deploy/caddy/Caddyfile` with your domain + email
- Builds app image with your `VITE_API_BASE_URL`
- Starts `app` + `caddy` via `docker compose`
- Terminates TLS and reverse-proxies traffic to the app container

Useful commands:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml down
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
