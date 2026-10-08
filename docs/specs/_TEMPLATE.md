# Spec — <nome da funcionalidade>

- **Issue:** #<n>
- **Fase:** <0 | 1 (MVP) | 2 | 3> (ver `docs/produto/roadmap.md`)
- **Status:** rascunho | pronta para implementar | implementada

> Copie este arquivo para `docs/specs/<nome-curto>.md`. Escreva a spec **antes** de implementar e atualize **no mesmo PR** se o comportamento mudar durante a implementação.

## Contexto
Por que esta funcionalidade existe e qual problema resolve. Em 2 a 5 linhas, citando os objetivos de `visao.md` (O1–O5) quando fizer sentido.

## Quem usa
Visitante | Cliente | Administração.

## Histórias
- Como **<perfil>**, quero **<ação>** para **<benefício>**.
- ...

## Regras envolvidas
Liste as regras de `docs/dominio/regras.md` que esta funcionalidade implementa ou precisa respeitar. **Não** reescreva a regra aqui: cite.
- RN-xx — <título curto>
- ...

Se surgir uma regra nova, ela vai para `regras.md` (com um número novo) no mesmo PR e é citada aqui.

## Critérios de aceite
Cada critério vira pelo menos um teste. Use o formato Dado / Quando / Então.

**CA-1 — <nome curto>**
- **Dado** <situação inicial>
- **Quando** <ação>
- **Então** <resultado observável>

**CA-2 — <caso de erro>**
- **Dado** ...
- **Quando** ...
- **Então** a API responde `<status>` com `code` = `<CODIGO>` e a tela mostra "<mensagem>".

## Fluxo e telas
Passo a passo da interação, em lista ou em diagrama Mermaid. Link do Figma, se houver. Indique os estados de carregando, vazio e erro.

## API
Rotas novas ou alteradas (método, caminho, quem acessa: `/public`, `/me` ou `/admin`) e o que entra e sai em alto nível. O formato exato fica nos schemas Pydantic (ADR 0008).

## Fora do escopo desta spec
O que parece fazer parte, mas **não** será feito agora, para o agente não expandir o escopo.

## Dúvidas em aberto
Perguntas que precisam de decisão de um humano antes ou durante a implementação.
