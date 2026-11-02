/**
 * Cabeçalho com o caminho e a busca pedidos (`/admin/agenda?data=…`), que o
 * `proxy.ts` grava nas requisições de `/admin`. Layouts não recebem a URL, e
 * o da administração precisa dela para o login voltar à mesma página (#154).
 */
export const REQUESTED_PATH_HEADER = "x-requested-path";
