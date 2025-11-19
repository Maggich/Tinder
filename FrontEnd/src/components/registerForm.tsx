import React, { useState } from 'react';
import axios from 'axios';

export default function RegisterForm() {
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
        } catch (error: any) {
            if (error?.response?.data?.detail) {
                setMessage(`Ошибка: ${error.response.data.detail}`);
            } else {
                setMessage('Ошибка подключения к серверу');
            }
        }
    };

    return (
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

                <button className='reg-btn'>Register</button>
            </form>

            {message && <p className='message'>{message}</p>}
        </div>
    );
}
