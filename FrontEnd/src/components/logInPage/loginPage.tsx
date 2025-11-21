import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./loginPage.css";
export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData();
    form.append("username", username);
    form.append("password", password);

    try {
      const res = await axios.post("http://localhost:8000/login", form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);

      navigate("/main");

    } catch {
      setMsg("Неверный логин или пароль");
    }
  };

  return (
    <div className="login_wrapper">
      <div className="login_container">
        <div className="login_header">
          <h1 className="login_title">💜 Вход</h1>
          <p className="login_subtitle">Добро пожаловать! Введи свои учётные данные</p>
        </div>

        <form className="login_form" onSubmit={handleLogin}>
          <div className="form_group">
            <label className="form_label">Username</label>
            <input
              type="text"
              className="login_input"
              placeholder="Введи username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form_group">
            <label className="form_label">Password</label>
            <input
              type="password"
              className="login_input"
              placeholder="Введи пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login_btn">Войти</button>
        </form>

        {msg && <p className={`login_msg ${msg.includes('Неверный') ? 'error' : 'success'}`}>{msg}</p>}

        <p className="login_footer">
          Нет аккаунта? <a href="/register">Зарегистрируйся</a>
        </p>
      </div>
    </div>
  );
}