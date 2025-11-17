from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import bcrypt
from schema import UserCreate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conn = psycopg2.connect(
    dbname="postgres",
    user="postgres",
    password="1234",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

@app.post("/register")
async def register_user(user: UserCreate):
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    cur.execute(
        "INSERT INTO users (username, fullname, password, photo_name, photo_data) VALUES (%s, %s, %s) RETURNING id",
        (user.username, user.fullname, user. user.email, hashed_password, user.photo_name, psycopg2.Binary(user.photo_data)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return {"id": user_id, "username": user.username, "fullname": user.fullname}
    )