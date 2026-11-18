import { Alert } from "@/components/ui/alert";
import { formatLongDate } from "@/lib/format";
import { AdminLinkCard } from "./admin-link-card";
import { AdminPage } from "./admin-page";
import { loadDashboard } from "./painel/data";
import {
  KpiGrid,
  OccupancyList,
  PeakHeatmap,
  RevenueChart,
  TodayList,
} from "./painel/dashboard-view";

const shortcuts = [
  {
    href: "/admin/agenda",
    title: "Agenda",
    description: "Os agendamentos do dia e da semana, por barbeiro.",
  },
  {
    href: "/admin/relatorio",
    title: "Relatório",
    description:
      "O faturamento por período, por barbeiro e por forma de pagamento.",
  },
  {
    href: "/admin/clientes",
    title: "Clientes",
    description: "Busque, cadastre e corrija quem é atendido pela barbearia.",
  },
  {
    href: "/admin/cadastros",
    title: "Cadastros",
    description: "Dados da barbearia e horário de funcionamento.",
  },
];

/**
 * Início da administração: o painel de indicadores (RN-45), calculado pela
 * API e desenhado no servidor, sem JS no navegador, e os atalhos para as
 * áreas. Sem os indicadores, os atalhos continuam.
 */
export default async function AdminHomePage() {
  const dashboard = await loadDashboard();
  return (
    <AdminPage
      title="Painel"
      description={
        dashboard.data
          ? `Como a barbearia está hoje, ${formatLongDate(dashboard.data.today.date)}.`
          : "Como a barbearia está hoje."
      }
    >
      <div className="flex flex-col gap-10">
        {!dashboard.data ? (
          <Alert tone="danger" title={dashboard.message} />
        ) : (
          <>
            <KpiGrid dashboard={dashboard.data} />
            <div className="grid gap-6 lg:grid-cols-3">
              <RevenueChart dashboard={dashboard.data} />
              <TodayList dashboard={dashboard.data} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <OccupancyList dashboard={dashboard.data} />
              <PeakHeatmap dashboard={dashboard.data} />
            </div>
          </>
        )}
        <section aria-labelledby="atalhos" className="flex flex-col gap-4">
          <h2 id="atalhos" className="text-lg font-semibold text-ink">
            Atalhos
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.href}>
                <AdminLinkCard {...shortcut} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminPage>
  );
}
