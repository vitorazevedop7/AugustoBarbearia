"""Contrato HTTP da conclusão do atendimento (RN-40, RN-41)."""

from typing import Annotated

from pydantic import BaseModel, BeforeValidator

from app.modules.catalog.schemas import Money, Price
from app.modules.payments.models import PaymentMethod


def _reject_float(value: object) -> object:
    """Dinheiro nunca passa por `float`: um número JSON com casas decimais já
    chega arredondado ao `Decimal`. O valor vai como string ("35.50") ou inteiro."""
    if isinstance(value, float):
        raise ValueError('Envie o valor como texto decimal, por exemplo "35.50".')
    return value


# O formato é o do preço do serviço (`Price`, com a vírgula de quem digita), sem float.
Amount = Annotated[Price, BeforeValidator(_reject_float)]


class PaymentResponse(BaseModel):
    """O pagamento de um atendimento concluído. O valor é uma string decimal."""

    amount: Money
    method: PaymentMethod


class CompleteAppointment(BaseModel):
    """RN-40: a forma é obrigatória; sem `amount`, vale o preço congelado."""

    method: PaymentMethod
    amount: Amount | None = None


class PaymentUpdate(BaseModel):
    """RN-41: só os campos enviados mudam. O sinal do valor é conferido pelo
    service, com mensagem própria."""

    method: PaymentMethod | None = None
    amount: Amount | None = None
