import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Política de privacidade — Augusto Barbearia",
  description:
    "Quais dados pessoais a Augusto Barbearia guarda, para que servem e como pedir a exclusão.",
};

const summary = [
  "Guardamos seu nome, e-mail e telefone, e usamos esses dados só para o seu atendimento.",
  "Só você e a equipe da barbearia veem seus dados.",
  "Você pode pedir a exclusão dos seus dados pelo contato da barbearia.",
];

/** Política de privacidade (RN-72). O texto segue docs/specs/politica-privacidade.md. */
export default function PrivacyPolicyPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
    >
      <article className="mx-auto max-w-2xl">
        <Ornament align="start" />
        <h1 className="mt-6 font-heading text-display-2 font-bold text-ink">
          Política de privacidade
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
          Esta página explica, como pede a Lei Geral de Proteção de Dados
          (LGPD), quais dados pessoais a Augusto Barbearia guarda, para que eles
          servem e como pedir a exclusão.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Última atualização: 29 de outubro de 2026
        </p>

        <section
          aria-labelledby="resumo"
          className="mt-10 bg-surface p-6 shadow-card sm:p-8"
        >
          <h2 id="resumo" className="font-heading text-xl font-bold text-ink">
            Em resumo
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed marker:text-brand">
            {summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <PolicySection id="dados" title="Quais dados guardamos">
          <ul className="list-disc space-y-2 pl-5 marker:text-brand">
            <li>
              <strong className="font-semibold text-ink">
                Nome, e-mail e telefone.
              </strong>{" "}
              O telefone é pedido para agendar online, para a barbearia poder
              falar com você sobre um horário.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Seus agendamentos:
              </strong>{" "}
              o serviço, o barbeiro, a data, a hora e a situação de cada um.
              Quando o atendimento é concluído, guardamos também o valor pago e
              a forma de pagamento.
            </li>
          </ul>
          <p>
            Se você marca por telefone ou no balcão, a equipe cadastra só o seu
            nome e telefone. O e-mail é opcional.
          </p>
        </PolicySection>

        <PolicySection id="uso" title="Para que usamos">
          <p>
            Só para o seu atendimento: agendar, confirmar, lembrar, remarcar e
            cancelar os seus horários, e para a barbearia falar com você sobre
            eles.
          </p>
          <p>
            Não vendemos seus dados e não usamos eles para enviar propaganda.
          </p>
        </PolicySection>

        <PolicySection id="google" title="Entrar com o Google">
          <p>
            Para agendar online, você entra com a sua conta Google, sem criar
            senha. Do Google recebemos só o seu nome, o seu e-mail e a foto do
            perfil. Não recebemos a sua senha nem os outros dados da sua conta.
          </p>
          <p>
            O site usa cookies só para o login funcionar e manter você
            conectado. Não usamos cookies de propaganda nem de rastreamento.
          </p>
        </PolicySection>

        <PolicySection id="emails" title="E-mails que você recebe">
          <p>
            Se você tem e-mail cadastrado, a barbearia envia mensagens só sobre
            os seus horários:
          </p>
          <ul className="list-disc space-y-2 pl-5 marker:text-brand">
            <li>a confirmação, quando um agendamento é criado;</li>
            <li>
              um lembrete cerca de 24 horas antes, se o horário foi marcado com
              mais antecedência que isso;
            </li>
            <li>um aviso quando um agendamento é remarcado ou cancelado.</li>
          </ul>
          <p>Não enviamos propaganda por e-mail.</p>
        </PolicySection>

        <PolicySection id="quem-ve" title="Quem vê seus dados">
          <p>
            Você vê só os seus dados e os seus agendamentos. Outros clientes não
            têm acesso a eles.
          </p>
          <p>
            A equipe da barbearia vê os dados dos clientes para organizar a
            agenda e cuidar dos atendimentos.
          </p>
          <p>
            Para o site funcionar, usamos o login do Google, um serviço de envio
            de e-mails e um serviço de hospedagem, onde ficam o site e os dados.
          </p>
        </PolicySection>

        <PolicySection id="exclusao" title="Como pedir a exclusão">
          <p>
            Para pedir a exclusão dos seus dados, ou tirar uma dúvida sobre
            eles, fale com a equipe pelo contato da barbearia ou no balcão. O
            pedido é feito direto com a barbearia, não pelo site.
          </p>
        </PolicySection>

        <PolicySection
          id="historico"
          title="O que fica no histórico financeiro"
        >
          <p>
            Depois da exclusão, os atendimentos já concluídos continuam no
            histórico financeiro da barbearia, mas sem os seus dados pessoais:
            ficam só o serviço, o barbeiro, a data, o valor e a forma de
            pagamento, sem o seu nome, e-mail ou telefone.
          </p>
        </PolicySection>
      </article>
    </main>
  );
}

function PolicySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="mt-12 border-t border-line pt-10 sm:mt-16"
    >
      <h2 id={id} className="font-heading text-display-3 font-bold text-ink">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed sm:text-lg">
        {children}
      </div>
    </section>
  );
}
