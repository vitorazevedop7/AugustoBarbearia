import type { Metadata } from "next";
import { AdminLinkCard } from "../admin-link-card";
import { AdminPage } from "../admin-page";

export const metadata: Metadata = {
  title: "Cadastros — Administração — Augusto Barbearia",
};

/** Serviços entram aqui na próxima issue (S3.04). */
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
        <li>
          <AdminLinkCard
            href="/admin/cadastros/barbeiros"
            title="Barbeiros"
            description="Nome, foto, apresentação e situação de cada barbeiro."
          />
        </li>
      </ul>
    </AdminPage>
  );
}
