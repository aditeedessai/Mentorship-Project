"""Fix: allow google_email to be NULL in google_calendar_connections."""
from backend.database.database import get_connection

conn = get_connection()
raw_conn = conn._conn
cur = raw_conn.cursor()
cur.execute("ALTER TABLE google_calendar_connections ALTER COLUMN google_email DROP NOT NULL;")
raw_conn.commit()
cur.close()
print("Done - google_email column is now nullable.")
conn.close()
