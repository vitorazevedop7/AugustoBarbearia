/**
 * Modo demonstração (#199, ADR 0011): entrada sem Google em duas contas
 * fictícias fixas, para a demonstração pública e o vídeo do portfólio.
 *
 * Fica desligado por padrão. Liga com `DEMO_LOGIN_ENABLED=true`; numa imagem
 * de produção (`NODE_ENV=production`) também exige
 * `DEMO_LOGIN_ACKNOWLEDGE=public-demo`, que só o compose da demonstração
 * define. Sem essa confirmação, a flag é ignorada e o servidor registra o
 * erro, para um `DEMO_LOGIN_ENABLED` esquecido na Railway nunca abrir a
 * administração da barbearia a qualquer visitante.
 */

/** Valor exato que confirma, numa imagem de produção, a demonstração pública. */
export const DEMO_LOGIN_ACKNOWLEDGEMENT = "public-demo";

export type DemoRole = "admin" | "customer";

export type DemoAccount = {
  email: string;
  name: string;
  /** Para onde a entrada leva, se a página não pediu outro destino. */
  home: string;
};

/**
 * As duas contas fictícias. O domínio `.local` não recebe e-mail. A de
 * administração precisa estar em `ADMIN_EMAILS` da API (RN-71): o papel
 * continua vindo de lá, e não daqui. A de cliente tem cadastro, telefone e
 * agendamentos criados pelo `seed_demo` da API (o login a vincula pelo
 * e-mail, RN-23).
 */
export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  admin: {
    email: "admin@demo.augustobarbearia.local",
    name: "Administração Demo",
    home: "/admin",
  },
  customer: {
    email: "cliente@demo.augustobarbearia.local",
    name: "Cliente Demo",
    home: "/meus-agendamentos",
  },
};

type DemoEnv = {
  NODE_ENV?: string;
  DEMO_LOGIN_ENABLED?: string;
  DEMO_LOGIN_ACKNOWLEDGE?: string;
};

export type DemoLoginStatus =
  { enabled: true } | { enabled: false; error: string | null };

/** Decide, só pelas variáveis, se a entrada de demonstração vale. */
export function demoLoginStatus(env: DemoEnv): DemoLoginStatus {
  if (env.DEMO_LOGIN_ENABLED?.trim().toLowerCase() !== "true") {
    return { enabled: false, error: null };
  }
  if (
    env.NODE_ENV === "production" &&
    env.DEMO_LOGIN_ACKNOWLEDGE?.trim() !== DEMO_LOGIN_ACKNOWLEDGEMENT
  ) {
    return {
      enabled: false,
      error:
        "DEMO_LOGIN_ENABLED=true ignorado: numa imagem de produção, a entrada" +
        " de demonstração também exige" +
        ` DEMO_LOGIN_ACKNOWLEDGE=${DEMO_LOGIN_ACKNOWLEDGEMENT}` +
        " (só o docker-compose.demo.yml define). Veja docs/specs/modo-demonstracao.md.",
    };
  }
  return { enabled: true };
}

let reported = false;

/** Lê o ambiente do processo e registra o erro de configuração uma vez. */
export function isDemoLoginEnabled(): boolean {
  const status = demoLoginStatus(process.env);
  if (!status.enabled && status.error && !reported) {
    reported = true;
    console.error(status.error);
  }
  return status.enabled;
}

/** O papel pedido pelo formulário, ou `null` se não é um dos dois. */
export function parseDemoRole(value: unknown): DemoRole | null {
  return value === "admin" || value === "customer" ? value : null;
}
