"""Contrato HTTP do agendamento pela administração."""

from typing import Self

from pydantic import AwareDatetime, BaseModel, ConfigDict, model_validator

from app.modules.customers.schemas import CustomerCreate


class AdminAppointmentCreate(BaseModel):
    """RN-20: o cliente é um já cadastrado (`customer_id`) ou um novo, criado
    na hora (`customer`), nunca os dois."""

    model_config = ConfigDict(extra="forbid")

    customer_id: int | None = None
    # Nome e telefone obrigatórios, e-mail opcional (RN-62), como no cadastro.
    customer: CustomerCreate | None = None
    barber_id: int
    service_id: int
    # Um dos inícios de `GET /admin/availability`, com o fuso (RN-01).
    starts_at: AwareDatetime

    @model_validator(mode="after")
    def one_customer(self) -> Self:
        if (self.customer_id is None) == (self.customer is None):
            raise ValueError("Informe `customer_id` ou `customer`, e só um deles.")
        return self


class AdminAppointmentReschedule(BaseModel):
    """RN-15: muda o início e, se quiser, o barbeiro. O serviço não muda, então o
    corpo não aceita `service_id`."""

    model_config = ConfigDict(extra="forbid")

    # Um dos inícios de `GET /admin/appointments/{id}/availability`, com o fuso.
    starts_at: AwareDatetime
    # Sem ele, o barbeiro continua o mesmo.
    barber_id: int | None = None
