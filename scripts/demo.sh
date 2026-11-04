#!/usr/bin/env bash
# Demonstração no notebook com link público (ADR 0010, #184).
# Roteiro completo: docs/specs/demonstracao-local.md.
#
#   scripts/demo.sh up      sobe tudo, mostra o link e mantém o Mac acordado
#   scripts/demo.sh url     mostra o link atual
#   scripts/demo.sh logs    acompanha os logs
#   scripts/demo.sh down    para tudo e guarda o banco da demonstração
#   scripts/demo.sh reset   para tudo e apaga o banco (os dados fictícios
#                           são recriados na próxima subida, com as datas de hoje)
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.demo
LOCAL_URL=http://localhost:3001

# O compose exige DEMO_URL e BETTER_AUTH_SECRET até para ler logs. Antes de o
# túnel mostrar o link, vale um valor provisório.
compose() {
  local file=$ENV_FILE url secret
  [ -f "$file" ] || file=.env.demo.example
  url=$(get_env "$file" DEMO_URL)
  secret=$(get_env "$file" BETTER_AUTH_SECRET)
  DEMO_URL=${url:-http://pendente} BETTER_AUTH_SECRET=${secret:-pendente} \
    docker compose -f docker-compose.demo.yml --env-file "$file" "$@"
}

# Grava KEY=valor no .env.demo, sem mostrar o valor.
set_env() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    index($0, key "=") == 1 { print key "=" value; done = 1; next }
    { print }
    END { if (!done) print key "=" value }
  ' "$ENV_FILE" >"$tmp"
  mv "$tmp" "$ENV_FILE"
}

get_env() {
  local file=$1 key=$2
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" | head -n 1 | cut -d= -f2- || true
}

prepare_env() {
  [ -f "$ENV_FILE" ] && return
  cp .env.demo.example "$ENV_FILE"
  for key in ADMIN_EMAILS GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET RESEND_API_KEY EMAIL_FROM; do
    set_env "$key" "$(get_env .env "$key")"
  done
  set_env BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
  echo "Criei o $ENV_FILE com as credenciais do .env e um segredo novo."
}

tunnel_url() {
  compose logs tunnel 2>/dev/null |
    grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1 || true
}

wait_for_tunnel() {
  local url=""
  for _ in $(seq 1 60); do
    url=$(tunnel_url)
    [ -n "$url" ] && break
    sleep 1
  done
  if [ -z "$url" ]; then
    echo "O túnel não mostrou o link em 60 segundos. Veja: scripts/demo.sh logs" >&2
    exit 1
  fi
  echo "$url"
}

wait_for_web() {
  for _ in $(seq 1 180); do
    curl -fsS -o /dev/null "$LOCAL_URL" 2>/dev/null && return
    sleep 1
  done
  echo "O site não respondeu em 3 minutos. Veja: scripts/demo.sh logs" >&2
  exit 1
}

up() {
  prepare_env
  # O túnel sobe antes, para o link entrar na configuração do web e da API.
  compose up -d tunnel
  local url
  url=$(wait_for_tunnel)
  set_env DEMO_URL "$url"
  compose up -d --build db setup api auth-migrate web
  wait_for_web

  cat <<EOF

Demonstração no ar.

  Link para o celular: $url
  No notebook:         $LOCAL_URL

No Google Cloud, cliente OAuth "Augusto Barbearia — local", inclua:
  Origem JavaScript autorizada:   $url
  URI de redirecionamento:        $url/api/auth/callback/google

O link muda se o túnel reiniciar. Não rode "down" até o fim da reunião.
EOF

  # Só num terminal: rodado por outro programa, o script termina aqui.
  if [ -t 1 ] && command -v caffeinate >/dev/null; then
    echo
    echo "Mantendo o Mac acordado. Ctrl+C libera; a demonstração continua no ar."
    caffeinate -dims || true
  fi
}

case "${1:-}" in
  up) up ;;
  url)
    url=$(tunnel_url)
    [ -n "$url" ] && echo "$url" || { echo "Túnel fora do ar." >&2; exit 1; }
    ;;
  logs) compose logs -f ;;
  down) compose down ;;
  reset) compose down -v ;;
  *)
    sed -n '2,10p' "$0"
    exit 1
    ;;
esac
