"""
Run this script to add an `email` column to the `users` table if it doesn't exist.
Usage (PowerShell):
  cd BackEnd
  python add_email_column.py

It uses DB_* env vars if present, otherwise defaults to postgres/1234@localhost:5432
"""
import os
import psycopg2
from psycopg2 import OperationalError

DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', '1234')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

ALIAS = f"{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def main():
    try:
        conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT)
        cur = conn.cursor()
    except OperationalError as e:
        print(f"Failed to connect to DB {ALIAS}: {e}")
        return

    try:
        # Add column if not exists (Postgres supports IF NOT EXISTS for ADD COLUMN)
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email TEXT;
        """)
        # Create unique index if not exists (safer than UNIQUE constraint when adding to existing table)
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes WHERE tablename='users' AND indexname='users_email_idx'
                ) THEN
                    CREATE UNIQUE INDEX users_email_idx ON users (email);
                END IF;
            END
            $$;
        """)
        conn.commit()
        print("Column 'email' added (if it didn't exist) and unique index ensured.")
    except Exception as e:
        conn.rollback()
        print(f"Failed to alter table: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
