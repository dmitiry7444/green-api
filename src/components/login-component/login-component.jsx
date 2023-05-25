import React, {useState} from 'react';
import {useNavigate} from "react-router-dom";
import './login-component.css';

const LoginComponent = () => {

    const [idInstance, setIdInstance] = useState('');
    const [apiTokenInstance, setApiTokenInstance] = useState('');
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    function idInstanceHandleChange(event) {
        setIdInstance(event.target.value);
    }

    function handleChange(event) {
        setApiTokenInstance(event.target.value);
    }

    //получение настроек аккаунта - проверка если аккаунт
    function submit() {
        fetch(`https://api.green-api.com/waInstance` + idInstance + `/getSettings/` + apiTokenInstance)
            .then(response => response.json())
            .then(data => {
                sessionStorage.setItem('idInstance', idInstance);
                sessionStorage.setItem('apiTokenInstance', apiTokenInstance);
                navigate('/chat');
            })
            .catch(() => setError(true));
    }


    return (
        <div className="login-form">
            <div className="login-form-title">
                Вход в систему
            </div>
            {error ? <div className="login-form-error">Введены некорректные данные, попробуйте повторить ввод</div> : ''}
            <div className="form-control">
            <label>
                idInstance:
                <input className="form-input" type="text" value={idInstance} onChange={idInstanceHandleChange}/>
            </label>
            </div>
            <div className="form-control">
            <label>
                apiTokenInstance:
                <input className="form-input" type="text" value={apiTokenInstance} onChange={handleChange}/>
            </label>
            </div>
            <button className="login-form-button" disabled={!idInstance || !apiTokenInstance} onClick={submit}>Войти</button>
        </div>
    );
};

export default LoginComponent;