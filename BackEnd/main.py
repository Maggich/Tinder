from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2 import OperationalError, Error, IntegrityError
import bcrypt
import os
import base64

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
    
    raise RuntimeError(f"Failed to connect to the database: {e}")


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
    conn.rollback()


@app.post("/register")
async def register_user(
    username: str = Form(...),
    fullname: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    photo: UploadFile = File(...)
):
    
    if not username or not fullname or not email or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")

    
    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Uploaded photo is empty")
    if photo.content_type and not photo.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
    
    if len(photo_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo size exceeds 5MB limit")

    
    try:
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    except Exception:
        raise HTTPException(status_code=500, detail="Password hashing failed")

    
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
        
        raise HTTPException(status_code=409, detail=str(ie))
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        try:
            cur_local.close()
        except Exception:
            pass


@app.put("/user/{username}")
async def update_user(username: str, data: dict):
    """Обновить данные пользователя.
    Принимает JSON с полями: fullname, email, optional photo_data (base64) и photo_name.
    """
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    fullname = data.get('fullname')
    email = data.get('email')
    photo_data_b64 = data.get('photo_data')
    photo_name = data.get('photo_name')

    # Require fullname and email to be non-empty strings
    if not fullname or not isinstance(fullname, str) or not fullname.strip():
        raise HTTPException(status_code=400, detail="Fullname is required")
    if not email or not isinstance(email, str) or not email.strip():
        raise HTTPException(status_code=400, detail="Email is required")

    
    set_clauses = ["fullname = %s", "email = %s"]
    params = [fullname.strip(), email.strip()]

    
    if photo_data_b64:
        try:
            
            if isinstance(photo_data_b64, str) and photo_data_b64.startswith('data:'):
                photo_data_b64 = photo_data_b64.split(',')[-1]
            photo_bytes = base64.b64decode(photo_data_b64)
            set_clauses.append("photo_name = %s")
            set_clauses.append("photo_data = %s")
            params.append(photo_name if photo_name else None)
            params.append(psycopg2.Binary(photo_bytes))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid photo data: {e}")

    params.append(username)
    sql_query = f"UPDATE users SET {', '.join(set_clauses)} WHERE username = %s"

    cur_local = conn.cursor()
    try:
        cur_local.execute(sql_query, tuple(params))
        if cur_local.rowcount == 0:
            conn.rollback()
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
        return {"message": "User updated successfully"}
    except IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Email already in use")
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        try:
            cur_local.close()
        except Exception:
            pass



@app.post("/login")
async def login_user(
    username: str = Form(...),
    password: str = Form(...)
):
    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    cur_local = conn.cursor()
    try:
        cur_local.execute(
            """
            SELECT id, password, fullname FROM users WHERE username = %s
            """,
            (username,)
        )
        result = cur_local.fetchone()
        if not result:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        user_id, stored_hashed_password, fullname = result
        if not bcrypt.checkpw(password.encode('utf-8'), stored_hashed_password.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        return {
            "id": user_id,
            "username": username,
            "fullname": fullname,
            "token": f"token_{user_id}_{username}"
        }
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        try:
            cur_local.close()
        except Exception:
            pass


@app.get("/user/{username}")
async def get_user(username: str):
    """Получить данные пользователя по юзернейму"""
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    cur_local = conn.cursor()
    try:
        cur_local.execute(
            """
            SELECT id, username, fullname, email, photo_name, photo_data FROM users WHERE username = %s
            """,
            (username,)
        )
        result = cur_local.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        user_id, username_db, fullname, email, photo_name, photo_data = result

        photo_b64 = None
        if photo_data is not None:
            try:
                photo_b64 = base64.b64encode(photo_data).decode('utf-8')
            except Exception:
                photo_b64 = None

        return {
            "id": user_id,
            "username": username_db,
            "fullname": fullname,
            "email": email,
            "photo_name": photo_name,
            "photo_data": photo_b64
        }
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        try:
            cur_local.close()
        except Exception:
            pass


@app.get("/users")
async def list_users(exclude: str | None = None):
    """Вернуть список пользователей. Опционально исключить `exclude` (username)."""
    cur_local = conn.cursor()
    try:
        if exclude:
            cur_local.execute(
                """
                SELECT id, username, fullname, photo_name, photo_data FROM users WHERE username != %s
                """,
                (exclude,)
            )
        else:
            cur_local.execute(
                """
                SELECT id, username, fullname, photo_name, photo_data FROM users
                """
            )

        rows = cur_local.fetchall()
        users = []
        for user_id, username_db, fullname, photo_name, photo_data in rows:
            photo_b64 = None
            if photo_data is not None:
                try:
                    photo_b64 = base64.b64encode(photo_data).decode('utf-8')
                except Exception:
                    photo_b64 = None

            users.append({
                "id": user_id,
                "username": username_db,
                "fullname": fullname,
                "photo_name": photo_name,
                "photo_data": photo_b64,
            })

        return users
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        try:
            cur_local.close()
        except Exception:
            pass