"""Relatório financeiro da administração: a rota `/admin/reports/financial`
(RN-01, RN-42, RN-43, RN-44, RN-70).

Só leitura, e acima de `payments`, `agenda` e `barbers`: soma o que a conclusão
do atendimento grava, sem que nenhum deles o importe.
"""
