"""O id das entidades nas rotas e nos corpos (#147).

As chaves primárias são `integer` no Postgres. Um id fora de 1 a 2147483647
chegaria ao banco e derrubaria a requisição com `NumericValueOutOfRange`; com
este tipo, ele é recusado antes, com `422 VALIDATION_ERROR` (ADR 0008).
"""

from typing import Annotated

from annotated_types import Ge, Le

MAX_ID = 2_147_483_647

Id = Annotated[int, Ge(1), Le(MAX_ID)]
