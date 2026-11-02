import type { Metadata } from "next";
import { AdminLinkCard } from "../admin-link-card";
import { AdminPage } from "../admin-page";

export const metadata: Metadata = {
  title: "Cadastros — Administração — Augusto Barbearia",
};

export default function CadastrosPage() {
  return (
    <AdminPage title="Cadastros">
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        <li>
          <AdminLinkCard
            href="/admin/cadastros/servicos"
            title="Serviços"
            description="Preço, duração, quem realiza e situação de cada serviço."
          />
        </li>
      </ul>
    </AdminPage>
  );
}
