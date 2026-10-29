# Spec — Autenticação e permissões na API

- **Issue:** #31 (S2.09)
- **Fase:** 0 (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
A sessão Google e a emissão de JWT já existem no web (#30). A API precisa validar essa identidade e autorizar a administração conforme o [ADR 0003](../decisoes/0003-autenticacao.md), criando a base de acesso para o agendamento e a gestão (O1, O2).

## Quem usa
Cliente e administração. Visitantes continuam acessando as rotas públicas.

## Histórias
- Como usuário autenticado, quero que a API reconheça minha identidade com segurança.
- Como administração, quero que apenas as contas autorizadas acessem a gestão.

## Regras envolvidas
- RN-70 — Perfis e permissões.
- RN-71 — Acesso à administração.

## Critérios de aceite
**CA-1 — Identidade autenticada**
- **Dado** um JWT assinado com EdDSA/Ed25519 por uma chave do JWKS configurado, com `kid`, `iss`, `aud`, `exp`, `sub`, `email` e `name` válidos
- **Quando** `GET /me` recebe `Authorization: Bearer <token>`
- **Então** responde 200 com `sub`, `email`, `name` e `role`, sem acessar ou criar clientes no banco. *A partir da S3.06, `GET /me` também resolve o cadastro do cliente e devolve `has_phone` ([perfil-cliente.md](perfil-cliente.md)).*

**CA-2 — Credenciais inválidas**
- **Dado** um pedido sem Bearer válido, ou um token expirado, adulterado, malformado, com algoritmo, emissor, audiência ou claims obrigatórios inválidos
- **Quando** acessa `/me` ou `/admin/ping`
- **Então** responde 401, com `{code: "HTTP_401", message: "Entre na sua conta para continuar."}` e `WWW-Authenticate: Bearer`.

**CA-3 — Papel decidido na API**
- **Dado** um token válido
- **Quando** a API resolve a identidade
- **Então** atribui `admin` apenas se o e-mail está em `ADMIN_EMAILS` (lista por vírgulas, ignorando espaços nas extremidades e diferenças entre maiúsculas/minúsculas); caso contrário atribui `customer`. Um claim de papel no token não concede permissão.
- **Quando** um cliente acessa `/admin/ping`
- **Então** responde 403, com `{code: "HTTP_403", message: "Você não tem permissão para realizar esta ação."}`; um administrador recebe 200 com `{status: "ok"}`.

**CA-4 — Cache e rotação de chaves**
- **Dado** um JWKS obtido de `AUTH_JWKS_URL`
- **Quando** chegam tokens de uma chave conhecida durante a validade do cache
- **Então** a API reutiliza as chaves por até 5 minutos. Um `kid` desconhecido provoca nova busca (timeout de 5 segundos); se continuar desconhecido ou o JWKS estiver indisponível/inválido, o acesso é negado com 401, sem confiar em URLs do token.

**CA-5 — Web autenticado e administração**
- **Dado** uma chamada pelo cliente HTTP do servidor web
- **Quando** existe sessão
- **Então** envia o JWT de `getApiToken()` como Bearer; sem sessão, permite chamadas públicas sem Authorization.
- **Quando** abre `/admin`
- **Então** o servidor consulta `/admin/ping`; com 200 mostra “Acesso permitido”, com 401 sem sessão redireciona para `/entrar?voltar=/admin`, com 403 redireciona para `/`. Falhas de infraestrutura mostram um aviso de indisponibilidade, sem conceder acesso. Se a sessão web ainda existe, mas a API rejeita o JWT com 401 (ex.: JWKS indisponível), mostra o mesmo aviso, evitando um ciclo entre a administração e o login.

**CA-6 — Contrato e testes independentes**
- **Dado** o contrato OpenAPI exportado
- **Quando** os tipos do web são regenerados
- **Então** incluem as duas rotas, seus schemas e respostas de erro. Os testes da API usam chaves locais e um JWKS simulado, sem depender do web ou do Google.

## Fluxo e telas
O servidor web obtém o JWT da sessão, chama a API e segue sua decisão de autorização. `/admin` é uma página de prova mínima, com os componentes e tokens do design system. A página não lê `ADMIN_EMAILS` nem decide o papel do usuário.

## API
- `GET /me`: qualquer identidade autenticada, retorna `sub`, `email`, `name`, `role` (`admin` ou `customer`).
- `GET /admin/ping`: exige administrador, retorna `{status: "ok"}`.
- Dependências reutilizáveis `current_user` e `require_admin` em `app/auth/`.
- Configuração: `AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE` e `ADMIN_EMAILS`. Nenhum segredo é retornado nos erros.

## Fora do escopo desta spec
Tabela e vínculo de clientes (RN-23), cadastro de telefone, telas de gestão, mudanças no login Google e migrações de banco.

## Dúvidas em aberto
Nenhuma.
