"""add daily_reports table

Revision ID: 5a7b3c9d1e2f
Revises: 0e7ecc089d2d
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import JSON

revision: str = "5a7b3c9d1e2f"
down_revision: Union[str, None] = "0e7ecc089d2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True, index=True),
        sa.Column("news_score", sa.Float(), nullable=False),
        sa.Column("cape_score", sa.Float(), nullable=False),
        sa.Column("yield_curve_score", sa.Float(), nullable=False),
        sa.Column("vix_score", sa.Float(), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False),
        sa.Column("target_allocation", JSON(), nullable=False),
        sa.Column("headline", sa.Text(), nullable=True),
        sa.Column("key_concerns", JSON(), nullable=True),
        sa.Column("key_positives", JSON(), nullable=True),
        sa.Column("gemini_limited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("daily_reports")
