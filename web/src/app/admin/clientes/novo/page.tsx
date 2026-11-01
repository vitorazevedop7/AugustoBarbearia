import type { Metadata } from "next";
import { AdminPage } from "../../admin-page";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = {
  title: "Novo cliente — Administração — Augusto Barbearia",
};

export default function NovoClientePage() {
  return (
    <AdminPage
      title="Novo cliente"
      description="Para quem liga ou chega no balcão. Nome e telefone bastam; o e-mail é opcional."
    >
      <CustomerForm />
    </AdminPage>
  );
}
