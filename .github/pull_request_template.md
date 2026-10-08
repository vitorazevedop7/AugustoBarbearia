Closes #

## O que muda
<!-- Em poucas linhas: o que este PR faz e por quê. -->

## Como testar
<!-- Passos para verificar manualmente, se aplicável. -->

## Checklist
- [ ] A issue está vinculada (`Closes #n`) e o PR resolve só o escopo dela
- [ ] Testes cobrem os critérios de aceite da spec (nomes citam a RN quando aplicável)
- [ ] CI verde (lint, tipos, testes)
- [ ] **Documentação atualizada no mesmo PR**, se o comportamento mudou: `regras.md`, `modelo.md`, a spec ou a `arquitetura.md`
- [ ] Mudou um schema da API → `pnpm gen:api` rodado e o arquivo gerado commitado (ADR 0008)
- [ ] Mudou o banco → migração do Alembic incluída e revisada
- [ ] Nenhum ADR aceito foi editado (uma mudança de decisão vira um ADR novo)
