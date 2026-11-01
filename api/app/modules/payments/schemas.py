"""Contrato HTTP da conclusão do atendimento (RN-40, RN-41)."""

from pydantic import BaseModel

from app.modules.catalog.schemas import Money, Price
from app.modules.payments.models import PaymentMethod


class PaymentResponse(BaseModel):
    """O pagamento de um atendimento concluído. O valor é uma string decimal."""

    amount: Money
    method: PaymentMethod


class CompleteAppointment(BaseModel):
    """RN-40: a forma é obrigatória; sem `amount`, vale o preço congelado."""

    method: PaymentMethod
    amount: Price | None = None


class PaymentUpdate(BaseModel):
    """RN-41: só os campos enviados mudam. O sinal do valor é conferido pelo
    service, com mensagem própria."""

    method: PaymentMethod | None = None
    amount: Price | None = None
