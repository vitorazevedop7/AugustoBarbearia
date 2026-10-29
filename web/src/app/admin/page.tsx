import { AdminLinkCard } from "./admin-link-card";
import { AdminPage } from "./admin-page";

/** Início da administração. A agenda do dia vira a primeira tela quando existir. */
export default function AdminHomePage() {
  return (
    <AdminPage
      title="Administração"
      description="Escolha o que você quer fazer."
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <AdminLinkCard
            href="/admin/cadastros"
            title="Cadastros"
            description="Dados da barbearia e horário de funcionamento."
          />
        </li>
      </ul>
    </AdminPage>
  );
}
