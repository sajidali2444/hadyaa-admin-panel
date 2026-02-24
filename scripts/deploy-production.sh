#!/usr/bin/env bash

set -euo pipefail

APP_NAME="hadyaa-admin-panel"
APP_PORT="3000"
API_URL_DEFAULT="https://app3.kualifai.com/api"

DOMAIN=""
EMAIL=""
API_URL="$API_URL_DEFAULT"
SKIP_CERTBOT="false"
WITH_WWW="false"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-production.sh --domain <domain> --email <email> [options]

Required:
  --domain <domain>       Main domain (example: admin.example.com)
  --email <email>         Email for Let's Encrypt (required unless --skip-certbot)

Options:
  --api-url <url>         Frontend API base URL (default: https://app3.kualifai.com/api)
  --with-www              Also configure/use www.<domain> in Nginx + SSL
  --skip-certbot          Skip HTTPS certificate provisioning
  --help                  Show this help

Examples:
  ./scripts/deploy-production.sh --domain admin.example.com --email ops@example.com
  ./scripts/deploy-production.sh --domain example.com --email ops@example.com --with-www
  ./scripts/deploy-production.sh --domain admin.example.com --email ops@example.com --api-url https://app3.kualifai.com/api
  ./scripts/deploy-production.sh --domain admin.example.com --skip-certbot --email ops@example.com
EOF
}

log() {
  printf "\n[deploy] %s\n" "$1"
}

fail() {
  printf "\n[deploy][error] %s\n" "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    --skip-certbot)
      SKIP_CERTBOT="true"
      shift
      ;;
    --with-www)
      WITH_WWW="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$DOMAIN" ]] || fail "--domain is required"
if [[ "$SKIP_CERTBOT" != "true" ]]; then
  [[ -n "$EMAIL" ]] || fail "--email is required unless --skip-certbot is used"
fi

if [[ "$(id -u)" -eq 0 ]]; then
  fail "Run this script as a non-root deploy user with sudo privileges."
fi

if ! command -v sudo >/dev/null 2>&1; then
  fail "sudo is required for server setup."
fi

require_command node
require_command npm
require_command pnpm

PRIMARY_DOMAIN="$DOMAIN"
SECONDARY_DOMAIN=""
DISPLAY_DOMAIN="$PRIMARY_DOMAIN"
if [[ "$WITH_WWW" == "true" ]]; then
  if [[ "$DOMAIN" == www.* ]]; then
    SECONDARY_DOMAIN="${DOMAIN#www.}"
  else
    SECONDARY_DOMAIN="www.$DOMAIN"
  fi
fi

log "Using app directory: $APP_DIR"
cd "$APP_DIR"

log "Writing .env.production with API URL: $API_URL"
cat > .env.production <<EOF
VITE_API_BASE_URL=$API_URL
EOF

log "Installing project dependencies and building app"
pnpm install --frozen-lockfile
pnpm build

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2 globally"
  if ! npm install -g pm2; then
    sudo npm install -g pm2
  fi
fi

log "Installing OS packages for reverse proxy and SSL"
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y nginx certbot python3-certbot-nginx
else
  fail "This script currently supports apt-based Linux servers."
fi

log "Starting or restarting PM2 app: $APP_NAME"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --only "$APP_NAME" --update-env
fi
pm2 save

log "Configuring PM2 startup service"
sudo env "PATH=$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

NGINX_SITE_PATH="/etc/nginx/sites-available/$APP_NAME"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/$APP_NAME"

log "Writing Nginx site config: $NGINX_SITE_PATH"
sudo tee "$NGINX_SITE_PATH" >/dev/null <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $PRIMARY_DOMAIN${SECONDARY_DOMAIN:+ $SECONDARY_DOMAIN};

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;

    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;

    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
EOF

if [[ ! -L "$NGINX_ENABLED_PATH" ]]; then
  sudo ln -sf "$NGINX_SITE_PATH" "$NGINX_ENABLED_PATH"
fi

if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

log "Testing and reloading Nginx"
sudo nginx -t
sudo systemctl reload nginx

if [[ "$SKIP_CERTBOT" != "true" ]]; then
  log "Requesting Let's Encrypt certificate"
  CERTBOT_ARGS=(--nginx --non-interactive --agree-tos -m "$EMAIL" -d "$PRIMARY_DOMAIN")
  if [[ -n "$SECONDARY_DOMAIN" ]]; then
    CERTBOT_ARGS+=(-d "$SECONDARY_DOMAIN")
  fi
  sudo certbot "${CERTBOT_ARGS[@]}"
fi

log "Deployment complete"
printf "\nApp URL: https://%s\n" "$DISPLAY_DOMAIN"
printf "Donation URL: https://%s/donations\n" "$DISPLAY_DOMAIN"
if [[ -n "$SECONDARY_DOMAIN" ]]; then
  printf "Additional domain: https://%s\n" "$SECONDARY_DOMAIN"
fi
printf "PM2 status: pm2 status\n"
