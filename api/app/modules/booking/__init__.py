"""Agendamento pelo cliente: as rotas `/me/appointments` (RN-10 a RN-16).

Fica acima de `appointments`, `availability`, `catalog`, `barbers` e
`customers`. Não mora em `appointments` porque `appointments` não pode importar
`availability`: `availability` → `barbers` → `appointments` formaria um ciclo.
"""
