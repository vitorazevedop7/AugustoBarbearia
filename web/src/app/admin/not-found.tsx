import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "./admin-page";

/**
 * Página da administração que não existe, ou um id inválido (`notFound()`),
 * dentro do layout dela, com a navegação (#151).
 */
export default function AdminNotFound() {
  return (
    <AdminPage
      title="Página não encontrada"
      description="O endereço pode ter mudado, ou o cadastro não existe mais."
    >
      <ButtonLink href="/admin" variant="outline">
        Voltar para o início da administração
      </ButtonLink>
    </AdminPage>
  );
}
