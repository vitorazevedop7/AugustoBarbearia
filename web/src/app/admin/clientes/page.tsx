import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { createApiClient } from "@/lib/api/client";
import { formatPhone } from "@/lib/format";
import { AdminPage } from "../admin-page";
import { apiMessage } from "../form-state";
import {
  CUSTOMERS_PATH,
  listHref,
  noticeMessage,
  PAGE_SIZE,
  parsePage,
  parseQuery,
} from "./form-data";

export const metadata: Metadata = {
  title: "Clientes — Administração — Augusto Barbearia",
};

const unavailableMessage =
  "Não foi possível carregar os clientes. Tente novamente em instantes.";

const description = "Quem já foi atendido ou cadastrado pela barbearia.";

function NewCustomerLink() {
  return (
    <ButtonLink
      href={`${CUSTOMERS_PATH}/novo`}
      size="sm"
      className="w-full sm:w-auto"
    >
      Novo cliente
    </ButtonLink>
  );
}

/** Busca por nome, telefone ou e-mail. É um GET: funciona sem JS e a URL se compartilha. */
function SearchForm({ query }: { query: string }) {
  return (
    <form
      action={CUSTOMERS_PATH}
      method="get"
      role="search"
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="sm:max-w-md sm:flex-1">
        <TextField
          name="q"
          label="Buscar por nome, telefone ou e-mail"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={100}
          required={false}
          defaultValue={query}
        />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" variant="outline" size="sm">
          Buscar
        </Button>
        {query ? (
          <ButtonLink href={CUSTOMERS_PATH} variant="ghost" size="sm">
            Limpar busca
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}

function Pagination({
  query,
  page,
  total,
}: {
  query: string;
  page: number;
  total: number;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <nav
      aria-label="Páginas de clientes"
      className="flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <ButtonLink
          href={listHref({ q: query, page: page - 1 })}
          variant="outline"
          size="sm"
          rel="prev"
        >
          Anterior
        </ButtonLink>
      ) : (
        <span aria-hidden="true" />
      )}
      <p className="text-sm text-ink-muted tabular-nums">
        Página {page} de {pages}
      </p>
      {page < pages ? (
        <ButtonLink
          href={listHref({ q: query, page: page + 1 })}
          variant="outline"
          size="sm"
          rel="next"
        >
          Próxima
        </ButtonLink>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}

/** Clientes por nome, com busca e páginas (RN-20, RN-62). */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = noticeMessage(params.aviso);
  const query = parseQuery(params.q);
  const page = parsePage(params.pagina);

  let result;
  try {
    result = await createApiClient().GET("/admin/customers", {
      params: {
        query: { ...(query ? { q: query } : {}), page, page_size: PAGE_SIZE },
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    result = undefined;
  }

  if (!result?.data) {
    return (
      <AdminPage title="Clientes" description={description}>
        <div className="flex flex-col gap-6">
          <SearchForm query={query} />
          <Alert
            tone="danger"
            title={apiMessage(result?.error, unavailableMessage)}
          />
        </div>
      </AdminPage>
    );
  }

  const { items: customers, total } = result.data;
  const searching = query !== "" || page > 1;
  return (
    <AdminPage title="Clientes" description={description}>
      <div className="flex flex-col gap-6">
        {notice ? (
          <Alert tone="success" revealOnMount="top" title={notice} />
        ) : null}
        <SearchForm query={query} />
        {customers.length === 0 && total > 0 ? (
          <EmptyState
            title="Esta página ficou vazia"
            description="A lista mudou desde que você abriu esta página."
            action={
              <ButtonLink
                href={listHref({ q: query, page: 1 })}
                variant="outline"
                size="sm"
              >
                Voltar à primeira página
              </ButtonLink>
            }
          />
        ) : customers.length === 0 ? (
          <EmptyState
            title={
              searching
                ? "Nenhum cliente encontrado"
                : "Nenhum cliente cadastrado"
            }
            description={
              searching
                ? "Confira o texto da busca ou cadastre o cliente."
                : "Cadastre quem liga ou chega no balcão para poder agendá-lo."
            }
            action={<NewCustomerLink />}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-muted tabular-nums">
                {total === 1 ? "1 cliente" : `${total} clientes`}
              </p>
              <NewCustomerLink />
            </div>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((customer) => (
                <li
                  key={customer.id}
                  className="flex min-w-0 flex-col items-start gap-3 bg-surface p-4 shadow-card sm:p-6"
                >
                  <p className="w-full truncate font-semibold text-ink">
                    {customer.name}
                  </p>
                  <div className="w-full min-w-0 text-sm text-ink-muted">
                    <p className="tabular-nums">
                      {customer.phone
                        ? formatPhone(customer.phone)
                        : "Sem telefone"}
                    </p>
                    {customer.email ? (
                      <p className="break-all">{customer.email}</p>
                    ) : null}
                  </div>
                  {customer.has_account ? (
                    <Badge tone="success">Com conta Google</Badge>
                  ) : (
                    <Badge tone="muted">Sem conta</Badge>
                  )}
                  <ButtonLink
                    href={`${CUSTOMERS_PATH}/${customer.id}`}
                    variant="outline"
                    size="sm"
                    aria-label={`Editar ${customer.name}`}
                  >
                    Editar
                  </ButtonLink>
                </li>
              ))}
            </ul>
            <Pagination query={query} page={page} total={total} />
          </>
        )}
      </div>
    </AdminPage>
  );
}
