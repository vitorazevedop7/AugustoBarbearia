/**
 * Roda uma vez na subida do servidor. Confere a configuração do modo
 * demonstração (#199, ADR 0011): ligado, avisa no log; ligado numa imagem de
 * produção sem a confirmação, registra o erro e segue com a flag ignorada.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { isDemoLoginEnabled } = await import("@/lib/demo-mode");
  if (isDemoLoginEnabled()) {
    console.warn(
      "Modo demonstração ligado: /entrar oferece as contas fictícias sem Google.",
    );
  }
}
