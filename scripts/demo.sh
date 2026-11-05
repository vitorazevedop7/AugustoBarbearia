#!/usr/bin/env bash
# Demonstração no notebook com link público (ADR 0010, #184).
# Roteiro completo: docs/specs/demonstracao-local.md.
#
#   scripts/demo.sh up      sobe tudo, mostra o link e mantém o Mac acordado
#   scripts/demo.sh url     mostra o link atual
#   scripts/demo.sh logs    acompanha os logs
#   scripts/demo.sh down    para tudo e guarda o banco da demonstração
#   scripts/demo.sh reset   apaga o banco e mantém o túnel (os dados fictícios
#                           são recriados na próxima subida, com as datas de hoje,
#                           e o link continua o mesmo se o túnel ainda responder)
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.demo
LOCAL_URL=http://localhost:3001
# Volume do banco: <name do docker-compose.demo.yml>_<volume>.
DB_VOLUME=augusto-demo_demo-db-data

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

# O túnel rápido morre se o Mac dorme ou perde a conexão: o Cloudflare apaga o
# endereço, mas o container continua de pé. Ele está morto sem resposta nenhuma
# (o DNS some), com 530 (o Cloudflare não tem conexão com este túnel) ou com
# "Tunnel not found" no log recente. Com o web parado, um túnel vivo ainda
# responde (502), então isso não conta como morto.
tunnel_alive() {
  local url=$1 code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" 2>/dev/null) || true
  case "$code" in "" | 000 | 530) return 1 ;; esac
  ! compose logs --since 2m tunnel 2>/dev/null | grep -q "Tunnel not found"
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
  local url previous
  previous=$(get_env "$ENV_FILE" DEMO_URL)
  url=$(tunnel_url)
  if [ -n "$url" ] && ! tunnel_alive "$url"; then
    echo "O túnel $url caiu. Criando outro; o link vai mudar."
    compose up -d --force-recreate tunnel
  fi
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
  if [ -n "$previous" ] && [ "$previous" != "$url" ] && [ "$previous" != "http://pendente" ]; then
    echo
    echo "ATENÇÃO: o link mudou desde a última subida ($previous)."
    echo "Troque os dois endereços antigos no Google pelos de cima, senão o login falha."
  fi

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
    if [ -z "$url" ]; then
      echo "Túnel fora do ar." >&2
      exit 1
    fi
    echo "$url"
    if ! tunnel_alive "$url"; then
      echo "Esse link não responde mais. Rode scripts/demo.sh up para criar outro." >&2
      exit 1
    fi
    ;;
  logs) compose logs -f ;;
  down) compose down ;;
  reset)
    # Tudo menos o túnel: com ele de pé, o próximo "up" reaproveita o link, e
    # os endereços cadastrados no Google continuam valendo.
    compose rm --stop --force -v db setup api auth-migrate web
    docker volume rm --force "$DB_VOLUME" >/dev/null
    echo "Banco da demonstração apagado. Rode scripts/demo.sh up para recriar os dados com as datas de hoje."
    ;;
  *)
    sed -n '2,11p' "$0"
    exit 1
    ;;
esac
