#!/usr/bin/env bash

set -euo pipefail

APP_PORT="3000"
HOST_PORT="3000"
API_URL_DEFAULT="https://app3.kualifai.com/api"
COMPOSE_FILE="docker-compose.production.yml"
GENERATED_NGINX_CONF="deploy/nginx/default.conf"

DOMAIN=""
API_URL="$API_URL_DEFAULT"
WITH_WWW="false"
LEGACY_EMAIL=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-production-docker.sh --domain <domain> [options]

Required:
  --domain <domain>       Main domain (example: admin.example.com)

Options:
  --api-url <url>         Frontend API base URL (default: https://app3.kualifai.com/api)
  --with-www              Also configure/use www.<domain>
  --email <email>         Deprecated (ignored; kept for backward compatibility)
  --help                  Show this help

Examples:
  ./scripts/deploy-production-docker.sh --domain admin.example.com
  ./scripts/deploy-production-docker.sh --domain example.com --with-www
  ./scripts/deploy-production-docker.sh --domain admin.example.com --api-url https://app3.kualifai.com/api
EOF
}

log() {
  printf "\n[deploy-docker] %s\n" "$1"
}

fail() {
  printf "\n[deploy-docker][error] %s\n" "$1" >&2
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
      LEGACY_EMAIL="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
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

require_command docker
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required"

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

if [[ -n "$LEGACY_EMAIL" ]]; then
  log "--email is deprecated and ignored for Nginx deployment"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  fail "Missing compose file: $COMPOSE_FILE"
fi

log "Generating Nginx config: $GENERATED_NGINX_CONF"
mkdir -p "$(dirname "$GENERATED_NGINX_CONF")"
cat > "$GENERATED_NGINX_CONF" <<EOF
server {
  listen 80;
  server_name $PRIMARY_DOMAIN;

  location / {
    proxy_pass http://app:$APP_PORT;
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

if [[ -n "$SECONDARY_DOMAIN" ]]; then
  cat >> "$GENERATED_NGINX_CONF" <<EOF

server {
  listen 80;
  server_name $SECONDARY_DOMAIN;

  location / {
    proxy_pass http://app:$APP_PORT;
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
fi

log "Building and starting containers"
export VITE_API_BASE_URL="$API_URL"
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

log "Deployment complete"
printf "\nApp URL: http://%s:%s\n" "$DISPLAY_DOMAIN" "$HOST_PORT"
printf "Donation URL: http://%s:%s/donations\n" "$DISPLAY_DOMAIN" "$HOST_PORT"
if [[ -n "$SECONDARY_DOMAIN" ]]; then
  printf "Additional domain: http://%s:%s\n" "$SECONDARY_DOMAIN" "$HOST_PORT"
fi
printf "Compose status: docker compose -f %s ps\n" "$COMPOSE_FILE"
printf "Compose logs: docker compose -f %s logs -f\n" "$COMPOSE_FILE"
