#!/usr/bin/env bash
# Recria o banco da demonstração (dados fictícios do seed) e deixa em aberto o
# último atendimento já iniciado de hoje do Edvaldo, para a gravação mostrar a conclusão.
# Roda na raiz do repositório, com o Docker ligado.
set -euo pipefail
cd "$(dirname "$0")/../.."
dc() { DEMO_URL=http://localhost:3001 docker compose -f docker-compose.demo.yml --env-file .env.demo "$@"; }
dc down -v
dc up -d web
for _ in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/)" = 200 ] && break
  sleep 2
done
dc exec -T db psql -U augusto -d augusto_demo -v ON_ERROR_STOP=1 <<'SQL'
WITH alvo AS (
  SELECT a.id FROM appointments a JOIN barbers b ON b.id = a.barber_id
  WHERE b.name = 'Edvaldo' AND a.status = 'COMPLETED'
    AND (a.starts_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND a.starts_at < now()
  ORDER BY a.starts_at DESC LIMIT 1
), pag AS (DELETE FROM payments WHERE appointment_id IN (SELECT id FROM alvo))
UPDATE appointments SET status = 'SCHEDULED', closed_at = NULL, closed_by = NULL
WHERE id IN (SELECT id FROM alvo) RETURNING id, starts_at;
SQL
