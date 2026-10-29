"""Habilita a extensão necessária à exclusion constraint da RN-08."""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")


def downgrade() -> None:
    # Sem CASCADE: nunca remover constraints que ainda dependam da extensão.
    op.execute("DROP EXTENSION IF EXISTS btree_gist")
