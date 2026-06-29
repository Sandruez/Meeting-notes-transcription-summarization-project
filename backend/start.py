"""Production startup — seeds the DB if empty, then hands off to uvicorn."""

import os
import subprocess
import sys

from database import SessionLocal, Base, engine
from models import Meeting

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    count = db.query(Meeting).count()
finally:
    db.close()

if count == 0:
    print("Database is empty — running seed.py …")
    subprocess.run([sys.executable, "seed.py"], check=True)
else:
    print(f"Database has {count} meetings — skipping seed.")

port = os.getenv("PORT", "8001")
subprocess.run(
    ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", port],
    check=True,
)
