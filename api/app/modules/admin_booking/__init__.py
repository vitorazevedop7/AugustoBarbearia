"""Agendamento pela administração: criar, cancelar e remarcar (RN-20 a RN-22).

Fica acima de `agenda`, `appointments`, `availability`, `catalog`, `barbers` e
`customers`, e nenhum deles o importa, então não forma ciclo. Não mora em
`booking`, que é do cliente (`/me`), nem em `agenda`, que só lê.
"""
