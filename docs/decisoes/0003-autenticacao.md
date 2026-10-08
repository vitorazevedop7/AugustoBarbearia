# 0003 — Login Google com Better Auth no Next.js e JWT validado na API

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
- O cliente entra com a conta Google (D3).
- A administração é a equipe da barbearia, identificada por uma lista de e-mails autorizados (RN-71).
- O barbeiro não faz login (D2).
- Com web e API separadas ([0001](0001-arquitetura-web-api.md)), a API precisa saber com segurança **quem** está chamando.

## Decisão
1. **Better Auth roda no Next.js** e é o único responsável pelo login: provider Google, sessão em cookie httpOnly no domínio do site. As tabelas dele ficam no PostgreSQL ([0002](0002-banco-de-dados.md)).
2. O **plugin JWT do Better Auth** emite, para a sessão atual, um token curto (15 min, EdDSA/Ed25519) com os claims `sub` (id do usuário), `email` e `name`.
3. **O Next (servidor) chama a API com `Authorization: Bearer <jwt>`.** O navegador nunca chama a API diretamente.
4. **A API valida o JWT** com as chaves públicas do endpoint JWKS do Better Auth (com cache e nova busca quando chega um `kid` desconhecido), conferindo `iss`, `aud` e `exp`.
5. **O papel é decidido na API, não no token:**
   - se o `email` está na variável `ADMIN_EMAILS` (lista separada por vírgula), o papel é **admin** (RN-71);
   - senão, o papel é **cliente**. A API encontra ou cria o `Customer` vinculado ao `sub`, ou vincula pelo e-mail se a administração já tinha cadastrado esse cliente (RN-23).
6. As rotas públicas (vitrine e consulta de disponibilidade) não exigem token.

## Alternativas consideradas
- **OAuth Google direto no FastAPI (Authlib) com sessão própria:** concentra a auth em Python, mas exige cuidar de cookies entre domínios, CSRF e sessão à mão. O Better Auth já resolve isso no lado em que está o navegador.
- **Passar o cookie de sessão do Better Auth para a API e consultar a tabela de sessões:** acopla a API ao formato interno do Better Auth.
- **Auth.js (NextAuth):** está em modo de manutenção. O Better Auth é o caminho recomendado hoje.

## Consequências
- A API é stateless quanto à autenticação: só valida a assinatura.
- Trocar a lista de administradores é mudar uma variável de ambiente, sem deploy de código.
- O Next precisa obter o JWT a cada chamada à API, ou cachear o token durante a validade dele.
- Testes da API geram JWTs de teste com um par de chaves local, sem depender do Next.
