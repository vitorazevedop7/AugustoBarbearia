import { AdminLinkCard } from "./admin-link-card";
import { AdminPage } from "./admin-page";

/** Início da administração: os atalhos para as áreas, a agenda primeiro. */
export default function AdminHomePage() {
  return (
    <AdminPage
      title="Administração"
      description="Escolha o que você quer fazer."
    >
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <AdminLinkCard
            href="/admin/agenda"
            title="Agenda"
            description="Os agendamentos do dia e da semana, por barbeiro."
          />
        </li>
        <li>
          <AdminLinkCard
            href="/admin/relatorio"
            title="Relatório"
            description="O faturamento por período, por barbeiro e por forma de pagamento."
          />
        </li>
        <li>
          <AdminLinkCard
            href="/admin/cadastros"
            title="Cadastros"
            description="Dados da barbearia e horário de funcionamento."
          />
        </li>
        <li>
          <AdminLinkCard
            href="/admin/clientes"
            title="Clientes"
            description="Busque, cadastre e corrija quem é atendido pela barbearia."
          />
        </li>
      </ul>
    </AdminPage>
  );
}
