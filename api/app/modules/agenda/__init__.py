"""Agenda da administração: as rotas `/admin/appointments` (RN-01, RN-02, RN-30, RN-70).

Fica acima de `appointments`, `barbers`, `catalog`, `customers` e `shop`. Não
mora em `appointments` porque `appointments` não pode importar `barbers`:
`barbers` já depende de `appointments` pela trava da RN-60.
"""
