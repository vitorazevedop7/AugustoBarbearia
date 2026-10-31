import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublicShop } from "@/lib/api/public";
import { BOOKING_PATH } from "@/lib/booking";
import { AppointmentCard } from "./appointment-card";
import { MyAppointmentsFrame } from "./appointments-frame";
import {
  loadUnavailableMessage,
  MY_APPOINTMENTS_PATH,
  noticeFrom,
  NOTICES,
} from "./appointments-state";
import { loadMyAppointments, requireSession } from "./data";

export const metadata: Metadata = {
  title: "Meus agendamentos — Augusto Barbearia",
  robots: { index: false },
};

/**
 * Os agendamentos do cliente (docs/specs/meus-agendamentos.md), em próximos
 * e histórico, como a API separa (RN-16). As ações de cada cartão vêm dos
 * campos `can_cancel` e `can_reschedule` da API (RN-14).
 */
export default async function MyAppointmentsPage({
  searchParams,
}: PageProps<"/meus-agendamentos">) {
  await requireSession(MY_APPOINTMENTS_PATH);
  const notice = noticeFrom((await searchParams).aviso);
  const [loaded, shop] = await Promise.all([
    loadMyAppointments(),
    getPublicShop(),
  ]);

  if (!loaded.data) {
    return (
      <MyAppointmentsFrame>
        <Alert tone="danger" title={loaded.message || loadUnavailableMessage} />
      </MyAppointmentsFrame>
    );
  }

  const { upcoming, history } = loaded.data;
  const book = (
    <ButtonLink href={BOOKING_PATH} size="sm">
      Agendar horário
    </ButtonLink>
  );

  return (
    <MyAppointmentsFrame>
      {notice ? (
        <div className="mb-8">
          <Alert tone="success" title={NOTICES[notice]} />
        </div>
      ) : null}
      {upcoming.length === 0 && history.length === 0 ? (
        <EmptyState
          title="Você ainda não tem horários"
          description="Escolha o barbeiro, o serviço e o horário em poucos toques."
          action={book}
        />
      ) : (
        <div className="flex flex-col gap-12">
          <section aria-labelledby="proximos">
            <h2
              id="proximos"
              className="font-heading text-display-4 font-black uppercase text-ink"
            >
              Próximos
            </h2>
            <div className="mt-4">
              {upcoming.length === 0 ? (
                <EmptyState title="Nenhum horário marcado" action={book} />
              ) : (
                <ul className="flex flex-col gap-4">
                  {upcoming.map((appointment) => (
                    <li key={appointment.id}>
                      <AppointmentCard
                        appointment={appointment}
                        upcoming
                        shop={shop}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          {history.length > 0 ? (
            <section aria-labelledby="historico">
              <h2
                id="historico"
                className="font-heading text-display-4 font-black uppercase text-ink"
              >
                Histórico
              </h2>
              <ul className="mt-4 flex flex-col gap-4">
                {history.map((appointment) => (
                  <li key={appointment.id}>
                    <AppointmentCard
                      appointment={appointment}
                      upcoming={false}
                      shop={shop}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </MyAppointmentsFrame>
  );
}
