#!/usr/bin/env bash

set -euo pipefail

APP_PORT="3000"
API_URL_DEFAULT="https://app3.kualifai.com/api"
COMPOSE_FILE="docker-compose.production.yml"
GENERATED_CADDYFILE="deploy/caddy/Caddyfile"

DOMAIN=""
EMAIL=""
API_URL="$API_URL_DEFAULT"
WITH_WWW="false"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-production-docker.sh --domain <domain> --email <email> [options]

Required:
  --domain <domain>       Main domain (example: admin.example.com)
  --email <email>         Email for TLS certificate registration

Options:
  --api-url <url>         Frontend API base URL (default: https://app3.kualifai.com/api)
  --with-www              Also configure/use www.<domain>
  --help                  Show this help

Examples:
  ./scripts/deploy-production-docker.sh --domain admin.example.com --email ops@example.com
  ./scripts/deploy-production-docker.sh --domain example.com --email ops@example.com --with-www
  ./scripts/deploy-production-docker.sh --domain admin.example.com --email ops@example.com --api-url https://app3.kualifai.com/api
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
      EMAIL="${2:-}"
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
[[ -n "$EMAIL" ]] || fail "--email is required"

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

if [[ ! -f "$COMPOSE_FILE" ]]; then
  fail "Missing compose file: $COMPOSE_FILE"
fi

log "Generating Caddy config: $GENERATED_CADDYFILE"
mkdir -p "$(dirname "$GENERATED_CADDYFILE")"
cat > "$GENERATED_CADDYFILE" <<EOF
{
  email $EMAIL
}

$PRIMARY_DOMAIN {
  reverse_proxy app:$APP_PORT
}
EOF

if [[ -n "$SECONDARY_DOMAIN" ]]; then
  cat >> "$GENERATED_CADDYFILE" <<EOF

$SECONDARY_DOMAIN {
  reverse_proxy app:$APP_PORT
}
EOF
fi

log "Building and starting containers"
export VITE_API_BASE_URL="$API_URL"
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

log "Deployment complete"
printf "\nApp URL: https://%s\n" "$DISPLAY_DOMAIN"
printf "Donation URL: https://%s/donations\n" "$DISPLAY_DOMAIN"
if [[ -n "$SECONDARY_DOMAIN" ]]; then
  printf "Additional domain: https://%s\n" "$SECONDARY_DOMAIN"
fi
printf "Compose status: docker compose -f %s ps\n" "$COMPOSE_FILE"
printf "Compose logs: docker compose -f %s logs -f\n" "$COMPOSE_FILE"
