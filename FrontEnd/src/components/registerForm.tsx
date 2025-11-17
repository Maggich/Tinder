import React, { useState } from 'react';
import axios from 'axios';

export default function RegisterForm() {
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [photo, setPhoto] = useState<File | null>(null );
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!photo){
            setMessage('Please upload a profile photo.');
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('fullName', fullName);
        formData.append('password', password);
        // photo is narrowed by the earlier check, so it's safe to append
        formData.append('photo', photo);

        try {
            const res = await axios.post(
                'http://localhost:8000/register',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' }  }
            );

            setMessage(`Успех! ваш ID ${res.data.userid}`);
        } catch (error : any) {
            if (error?.response?.data?.detail){
                setMessage(`Ошибка: ${error.response.data.detail}`);
            } else {
                setMessage('Ошибка подключения к серверу');
            }
        }
    };
    return (
        <>
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
                    onChange={(e) => setFullName(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className='input_field'
                    onChange={(e) => setPassword(e.target.value)}
                />
                <input
                    type="file"
                    placeholder="file-input"
                    className='input_field'
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />

                <button className='reg-btn'>Register</button>
            </form>
            {message && <p className='message'>{message}</p>}
        </div>
        </>
    );
}

