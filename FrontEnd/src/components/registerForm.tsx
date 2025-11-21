import React, { useState } from 'react';
import axios from 'axios';
import './registerForm.css';
import { useNavigate } from 'react-router-dom';

export default function RegisterForm() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!photo) {
            setMessage('Please upload a profile photo.');
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('fullname', fullname);
        formData.append('email', email);
        formData.append('password', password);

        formData.append('photo', photo, photo.name);

        try {
            const res = await axios.post(
                'http://localhost:8000/register',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setMessage(`Успех! ваш ID: ${res.data.id}`);
            // navigate to main page after successful registration
            navigate('/main');
        } catch (error: any) {
            if (error?.response?.data?.detail) {
                setMessage(`Ошибка: ${error.response.data.detail}`);
            } else {
                setMessage('Ошибка подключения к серверу');
            }
        }
    };

    return (
        <div className="register_wrapper">
            <div className="register_container">
                <h2 className='register_title'>Register</h2>

                <form className='register_form' onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        className='input_field'
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Full name"
                        className='input_field'
                        onChange={(e) => setFullname(e.target.value)}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        className='input_field'
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        className='input_field'
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <input
                        type="file"
                        className='input_field'
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    />

                    <button className='register_btn' type="submit">Register</button>
                    <p className="login_footer">
                        Есть аккаунт? <a href="/">Войти</a>
                    </p>
                </form>
                {message && <p className='message'>{message}</p>}
            </div>
        </div>
    );
}
