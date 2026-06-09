"""ensure portfolio_snapshots table exists

Revision ID: 6b8c4d0e2f3a
Revises: 5a7b3c9d1e2f
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = "6b8c4d0e2f3a"
down_revision: Union[str, None] = "5a7b3c9d1e2f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS portfolio_snapshots (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES user_profiles(id),
            name VARCHAR(100) NOT NULL,
            holdings JSON NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
        )
    """)


def downgrade() -> None:
    op.drop_table("portfolio_snapshots")
