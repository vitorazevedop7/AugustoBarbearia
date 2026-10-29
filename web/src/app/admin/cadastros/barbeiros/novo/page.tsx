import type { Metadata } from "next";
import { AdminPage } from "../../../admin-page";
import { BarberForm } from "../barber-form";

export const metadata: Metadata = {
  title: "Novo barbeiro — Administração — Augusto Barbearia",
};

export default function NovoBarbeiroPage() {
  return (
    <AdminPage
      title="Novo barbeiro"
      description="O barbeiro novo já entra ativo, na vitrine e no agendamento."
    >
      <BarberForm />
    </AdminPage>
  );
}
