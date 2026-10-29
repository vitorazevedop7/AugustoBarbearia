import type { Metadata } from "next";
import { AdminLinkCard } from "../admin-link-card";
import { AdminPage } from "../admin-page";

export const metadata: Metadata = {
  title: "Cadastros — Administração — Augusto Barbearia",
};

/** Barbeiros e serviços entram aqui nas próximas issues (S3.03, S3.04). */
export default function CadastrosPage() {
  return (
    <AdminPage title="Cadastros">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <AdminLinkCard
            href="/admin/cadastros/barbearia"
            title="Barbearia"
            description="Endereço, contato, textos da vitrine e horário de funcionamento."
          />
        </li>
      </ul>
    </AdminPage>
  );
}
