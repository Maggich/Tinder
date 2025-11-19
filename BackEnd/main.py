from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2 import sql, OperationalError, Error, IntegrityError
import bcrypt
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', '1234')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

try:
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT)
    conn.autocommit = False
    cur = conn.cursor()
except OperationalError as e:
    # If DB is unreachable, raise on startup so user sees clear error
    raise RuntimeError(f"Failed to connect to the database: {e}")

# Ensure users table exists with sensible columns
try:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            fullname TEXT,
            password TEXT,
            email TEXT UNIQUE,
            photo_name TEXT,
            photo_data BYTEA,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
except Error:
    # don't crash here irrecoverably; rollback and continue — errors will be caught on operations
    conn.rollback()


@app.post("/register")
async def register_user(
    username: str = Form(...),
    fullname: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    photo: UploadFile = File(...)
):
    # Basic validation
    if not username or not fullname or not email or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Read photo bytes and validate
    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Uploaded photo is empty")
    if photo.content_type and not photo.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
    # limit to 5MB
    if len(photo_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo size exceeds 5MB limit")

    # Hash password and store as text
    try:
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    except Exception:
        raise HTTPException(status_code=500, detail="Password hashing failed")

    # Save user using a dedicated cursor for this request
    cur_local = conn.cursor()
    try:
        cur_local.execute(
            """
            INSERT INTO users (username, fullname, password, email, photo_name, photo_data)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (username, fullname, hashed_password, email, photo.filename, psycopg2.Binary(photo_bytes))
        )
        user_id = cur_local.fetchone()[0]
        conn.commit()
    except IntegrityError as ie:
        conn.rollback()
        # possible unique constraint on username/email
        raise HTTPException(status_code=409, detail=str(ie))
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        try:
            cur_local.close()
        except Exception:
            pass

    return {"id": user_id}
