import React, {useEffect, useRef, useState} from 'react';
import {useNavigate} from "react-router-dom";
import './chat-component.css';


const ChatComponent = () => {
    const [idInstance, setIdInstance] = useState(sessionStorage.getItem('idInstance') ? sessionStorage.getItem('idInstance') : '');
    const [apiTokenInstance, setApiTokenInstance] = useState(sessionStorage.getItem('apiTokenInstance') ? sessionStorage.getItem('apiTokenInstance') : '');
    const [contacts, setContacts] = useState([]); // массив контактов для сайдбара
    const [user, setUser] = useState(''); // данные выбранного контакта
    const [message, setMessage] = useState(''); // сообщение для отправки
    const [chatMessage, setChatMessage] = useState([]); // история сообщений чата
    const [accountErr, setAccountErr] = useState(false); // флаг ошибки
    const [phone, setPhone] = useState(''); // номер телефона для создания чата
    const [isPopup, setIsPopup] = useState(false); // флаг открытия/закрытия попапа
    const [interval, setInterval] = useState(0);

    const navigate = useNavigate();
    const hasFetchedData = useRef(false);
    const divRef = useRef(null);

// инициализация контактов
    useEffect(() => {
        async function fetchData() {
            let chats = [];
            let contacts = [];
            try {
                await fetch(`https://api.green-api.com/waInstance` + idInstance + `/getContacts/` + apiTokenInstance)
                    .then(response => response.json())
                    .then(data => contacts = data);
                await fetch(`https://api.green-api.com/waInstance` + idInstance + `/getChats/` + apiTokenInstance)
                    .then(response => response.json())
                    .then(data => chats = data);
                await findContactInChats(chats, contacts);
            } catch (e) {
                console.log(e)
            }
        }

        if (idInstance && apiTokenInstance) {
            if (hasFetchedData.current === false) {
                fetchData();
                hasFetchedData.current = true;
            }
        } else {
            navigate('/');
        }
    }, []);

//фоновая проверка новых уведомлений

    useEffect(() => {
        const timer = setTimeout(() => {
            getNewMessage();
            setInterval(interval + 1);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, [interval]);


//скролл чата

    useEffect(() => {
        divRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [chatMessage]);

    function changeChat(value) {
        getChat(value.id);
        setUser(value);
    }

    //формирование единого массива контактов исходя из того если контакты в чатах
    function findContactInChats(arrayChats, arrayContacts) {
        const data = []
        const find = arrayChats.forEach(chat => {
            const contact = arrayContacts.find(contact => chat.id === contact.id);
            if (contact) {
                return data.push({id: chat.id, name: contact.name})
            } else {
                return data.push({id: chat.id})
            }
        })
        setContacts(data);
        setUser(data[0]);
    }

    // получение чата
    async function getChat(value) {
        try {
            await fetch(`https://api.green-api.com/waInstance` + idInstance + `/getChatHistory/` + apiTokenInstance, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: value,
                    count: 100,
                })
            })
                .then(response => response.json())
                .then(data => setChatMessage(data.reverse()));
        } catch (e) {
            console.log(e)
        }
    }

//проверка наличия ватсап при создании чата
    async function checkWatsApp(number) {
        let contactId = number.toString() + '@c.us';
        try {
            const isAccount = await fetch(`https://api.green-api.com/waInstance` + idInstance + `/checkWhatsapp/` + apiTokenInstance, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: Number(number),
                })
            })
                .then(response => response.json());
            if (isAccount.existsWhatsapp) {
                const updUser = {
                    id: contactId
                }
                setUser(updUser);
                getChat(contactId);

                if (contacts) {
                    const check = contacts.find(item => item.id === contactId);
                    if (!check) {
                        const addContact = contacts.slice();
                        addContact.unshift({
                            id: contactId
                        })
                        setContacts(addContact);
                    }
                }
                showPopupFunc();
            } else {
                setAccountErr(true)
            }
        } catch (e) {
            console.log(e)
            setAccountErr(true)
        }
    }

    //отправка сообщений
    async function sendMessage() {
        try {
            const isSuccess = await fetch(`https://api.green-api.com/waInstance` + idInstance + `/sendMessage/` + apiTokenInstance, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: user.id,
                    message: message

                })

            })
                .then(response => response.json());

            if (isSuccess.idMessage) {
                let updateChatMessage = chatMessage.slice();
                updateChatMessage.push({
                    type: "outgoing",
                    idMessage: isSuccess.idMessage,
                    chatId: user.id,
                    textMessage: message
                });
                setChatMessage(updateChatMessage)
                setMessage('');
            } else {
                setAccountErr(true)
            }
        } catch (e) {
            console.log(e)
            setAccountErr(true)
        }
    }

    // получение новых сообщений
    async function getNewMessage() {
        try {
            const data = await fetch(`https://api.green-api.com/waInstance` + idInstance + `/receiveNotification/` + apiTokenInstance)
                .then(response => response.json())
                .then(data => {
                    if (data) {
                        if (data.body.senderData?.chatId) {
                            if (data.body.senderData.chatId === user.id && data.body.typeWebhook === 'incomingMessageReceived') {
                                const updateChatMessage = chatMessage.slice();
                                updateChatMessage.push({
                                    type: "incoming",
                                    idMessage: data.body.idMessage,
                                    chatId: user.id,
                                    textMessage: data.body.messageData?.textMessageData?.textMessage
                                });
                                setChatMessage(updateChatMessage);
                            }
                            fetch(`https://api.green-api.com/waInstance` + idInstance + `/deleteNotification/` + apiTokenInstance + '/' + data.receiptId, {
                                method: 'DELETE',
                            });
                        } else {
                            fetch(`https://api.green-api.com/waInstance` + idInstance + `/deleteNotification/` + apiTokenInstance + '/' + data.receiptId, {
                                method: 'DELETE',
                            });
                        }
                    }
                });
        } catch (e) {
            console.log(e)
        }
    }

    // установление стейта тела сообщения
    function handleChangeMessage(event) {
        setMessage(event.target.value);
    }

    // установление стейта номера телефона
    function handlePhoneChange(event) {
        setPhone(event.target.value);
    }

    function showPopupFunc() {
        setIsPopup(!isPopup);
        setAccountErr(false);
    }

    //создание чата
    function createChat() {
        checkWatsApp(phone)
    }


    return (
        <div className="chat">
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <div className="chat-sidebar-header-action">
                        <div className="chat-sidebar-header-action-avatar">
                            <svg viewBox="0 0 212 212" height="212" width="212" preserveAspectRatio="xMidYMid meet"
                                 version="1.1" x="0px" y="0px">
                                <path fill="#FFFFFF" className="primary"
                                      d="M173.561,171.615c-0.601-0.915-1.287-1.907-2.065-2.955c-0.777-1.049-1.645-2.155-2.608-3.299 c-0.964-1.144-2.024-2.326-3.184-3.527c-1.741-1.802-3.71-3.646-5.924-5.47c-2.952-2.431-6.339-4.824-10.204-7.026 c-1.877-1.07-3.873-2.092-5.98-3.055c-0.062-0.028-0.118-0.059-0.18-0.087c-9.792-4.44-22.106-7.529-37.416-7.529 s-27.624,3.089-37.416,7.529c-0.338,0.153-0.653,0.318-0.985,0.474c-1.431,0.674-2.806,1.376-4.128,2.101 c-0.716,0.393-1.417,0.792-2.101,1.197c-3.421,2.027-6.475,4.191-9.15,6.395c-2.213,1.823-4.182,3.668-5.924,5.47 c-1.161,1.201-2.22,2.384-3.184,3.527c-0.964,1.144-1.832,2.25-2.609,3.299c-0.778,1.049-1.464,2.04-2.065,2.955 c-0.557,0.848-1.033,1.622-1.447,2.324c-0.033,0.056-0.073,0.119-0.104,0.174c-0.435,0.744-0.79,1.392-1.07,1.926 c-0.559,1.068-0.818,1.678-0.818,1.678v0.398c18.285,17.927,43.322,28.985,70.945,28.985c27.678,0,52.761-11.103,71.055-29.095 v-0.289c0,0-0.619-1.45-1.992-3.778C174.594,173.238,174.117,172.463,173.561,171.615z"></path>
                                <path fill="#FFFFFF" className="primary"
                                      d="M106.002,125.5c2.645,0,5.212-0.253,7.68-0.737c1.234-0.242,2.443-0.542,3.624-0.896 c1.772-0.532,3.482-1.188,5.12-1.958c2.184-1.027,4.242-2.258,6.15-3.67c2.863-2.119,5.39-4.646,7.509-7.509 c0.706-0.954,1.367-1.945,1.98-2.971c0.919-1.539,1.729-3.155,2.422-4.84c0.462-1.123,0.872-2.277,1.226-3.458 c0.177-0.591,0.341-1.188,0.49-1.792c0.299-1.208,0.542-2.443,0.725-3.701c0.275-1.887,0.417-3.827,0.417-5.811 c0-1.984-0.142-3.925-0.417-5.811c-0.184-1.258-0.426-2.493-0.725-3.701c-0.15-0.604-0.313-1.202-0.49-1.793 c-0.354-1.181-0.764-2.335-1.226-3.458c-0.693-1.685-1.504-3.301-2.422-4.84c-0.613-1.026-1.274-2.017-1.98-2.971 c-2.119-2.863-4.646-5.39-7.509-7.509c-1.909-1.412-3.966-2.643-6.15-3.67c-1.638-0.77-3.348-1.426-5.12-1.958 c-1.181-0.355-2.39-0.655-3.624-0.896c-2.468-0.484-5.035-0.737-7.68-0.737c-21.162,0-37.345,16.183-37.345,37.345 C68.657,109.317,84.84,125.5,106.002,125.5z"></path>
                            </svg>
                        </div>
                        <div className="chat-sidebar-header-action-items">
                            <div className="chat-sidebar-header-action-item">
                                <svg viewBox="0 0 24 24" height="24" width="24">
                                    <path
                                        d="m18 11v2h4v-2zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zm4.4-12.01c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zm-16.4 3.4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3v-12l-5 3zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"
                                        fill="#54656f"></path>
                                </svg>
                            </div>
                            <div className="chat-sidebar-header-action-item">
                                <svg viewBox="0 0 24 24" height="24" width="24">
                                    <path fill="#54656f"
                                          d="M12,20.664c-2.447,0.006-4.795-0.966-6.521-2.702c-0.381-0.381-0.381-1,0-1.381c0.381-0.381,1-0.381,1.381,0 l0,0c2.742,2.742,7.153,2.849,10.024,0.244c0.4-0.361,1.018-0.33,1.379,0.07c0.36,0.398,0.33,1.013-0.066,1.375 C16.502,19.813,14.292,20.666,12,20.664z M19.965,14.552c-0.539,0-0.977-0.437-0.977-0.976c0-0.085,0.011-0.17,0.033-0.253 c1.009-3.746-1.105-7.623-4.8-8.804c-0.51-0.175-0.782-0.731-0.607-1.241c0.17-0.495,0.7-0.768,1.201-0.619 c4.688,1.498,7.371,6.416,6.092,11.169C20.793,14.255,20.407,14.551,19.965,14.552z M3.94,14.162 c-0.459-0.001-0.856-0.321-0.953-0.769C1.939,8.584,4.858,3.801,9.613,2.533c0.52-0.144,1.058,0.161,1.201,0.681 c0.144,0.52-0.161,1.058-0.681,1.201c-0.005,0.001-0.01,0.003-0.015,0.004C6.37,5.418,4.07,9.187,4.895,12.977 c0.114,0.527-0.221,1.048-0.748,1.162C4.079,14.154,4.01,14.162,3.94,14.162z"></path>
                                </svg>
                            </div>
                            <div className="chat-sidebar-header-action-item">
                                <svg viewBox="0 0 24 24" height="24" width="24">
                                    <path fill="#54656f"
                                          d="M19.005,3.175H4.674C3.642,3.175,3,3.789,3,4.821V21.02 l3.544-3.514h12.461c1.033,0,2.064-1.06,2.064-2.093V4.821C21.068,3.789,20.037,3.175,19.005,3.175z M14.016,13.044H7.041V11.1 h6.975V13.044z M17.016,9.044H7.041V7.1h9.975V9.044z"></path>
                                </svg>
                            </div>
                            <div className="chat-sidebar-header-action-item">
                                <svg viewBox="0 0 24 24" height="24" width="24">
                                    <path fill="#54656f"
                                          d="M12,7c1.104,0,2-0.896,2-2c0-1.105-0.895-2-2-2c-1.104,0-2,0.894-2,2 C10,6.105,10.895,7,12,7z M12,9c-1.104,0-2,0.894-2,2c0,1.104,0.895,2,2,2c1.104,0,2-0.896,2-2C13.999,9.895,13.104,9,12,9z M12,15 c-1.104,0-2,0.894-2,2c0,1.104,0.895,2,2,2c1.104,0,2-0.896,2-2C13.999,15.894,13.104,15,12,15z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="chat-sidebar-header-button">
                        <button className="create-chat" onClick={showPopupFunc}>+ Создать новый чат</button>
                    </div>
                </div>
                <div className="chat-sidebar-contacts">
                    {contacts.map((contact) =>
                        <div className={user.id === contact.id ? 'contacts-item active' : 'contacts-item'}
                             key={contact.id} onClick={changeChat.bind(this, contact)}>
                            <div className="contact-avatar">
                                <svg viewBox="0 0 212 212" height="49" width="49" preserveAspectRatio="xMidYMid meet"
                                     version="1.1" x="0px" y="0px">
                                    <path fill="#FFFFFF" className="primary"
                                          d="M173.561,171.615c-0.601-0.915-1.287-1.907-2.065-2.955c-0.777-1.049-1.645-2.155-2.608-3.299 c-0.964-1.144-2.024-2.326-3.184-3.527c-1.741-1.802-3.71-3.646-5.924-5.47c-2.952-2.431-6.339-4.824-10.204-7.026 c-1.877-1.07-3.873-2.092-5.98-3.055c-0.062-0.028-0.118-0.059-0.18-0.087c-9.792-4.44-22.106-7.529-37.416-7.529 s-27.624,3.089-37.416,7.529c-0.338,0.153-0.653,0.318-0.985,0.474c-1.431,0.674-2.806,1.376-4.128,2.101 c-0.716,0.393-1.417,0.792-2.101,1.197c-3.421,2.027-6.475,4.191-9.15,6.395c-2.213,1.823-4.182,3.668-5.924,5.47 c-1.161,1.201-2.22,2.384-3.184,3.527c-0.964,1.144-1.832,2.25-2.609,3.299c-0.778,1.049-1.464,2.04-2.065,2.955 c-0.557,0.848-1.033,1.622-1.447,2.324c-0.033,0.056-0.073,0.119-0.104,0.174c-0.435,0.744-0.79,1.392-1.07,1.926 c-0.559,1.068-0.818,1.678-0.818,1.678v0.398c18.285,17.927,43.322,28.985,70.945,28.985c27.678,0,52.761-11.103,71.055-29.095 v-0.289c0,0-0.619-1.45-1.992-3.778C174.594,173.238,174.117,172.463,173.561,171.615z"></path>
                                    <path fill="#FFFFFF" className="primary"
                                          d="M106.002,125.5c2.645,0,5.212-0.253,7.68-0.737c1.234-0.242,2.443-0.542,3.624-0.896 c1.772-0.532,3.482-1.188,5.12-1.958c2.184-1.027,4.242-2.258,6.15-3.67c2.863-2.119,5.39-4.646,7.509-7.509 c0.706-0.954,1.367-1.945,1.98-2.971c0.919-1.539,1.729-3.155,2.422-4.84c0.462-1.123,0.872-2.277,1.226-3.458 c0.177-0.591,0.341-1.188,0.49-1.792c0.299-1.208,0.542-2.443,0.725-3.701c0.275-1.887,0.417-3.827,0.417-5.811 c0-1.984-0.142-3.925-0.417-5.811c-0.184-1.258-0.426-2.493-0.725-3.701c-0.15-0.604-0.313-1.202-0.49-1.793 c-0.354-1.181-0.764-2.335-1.226-3.458c-0.693-1.685-1.504-3.301-2.422-4.84c-0.613-1.026-1.274-2.017-1.98-2.971 c-2.119-2.863-4.646-5.39-7.509-7.509c-1.909-1.412-3.966-2.643-6.15-3.67c-1.638-0.77-3.348-1.426-5.12-1.958 c-1.181-0.355-2.39-0.655-3.624-0.896c-2.468-0.484-5.035-0.737-7.68-0.737c-21.162,0-37.345,16.183-37.345,37.345 C68.657,109.317,84.84,125.5,106.002,125.5z"></path>
                                </svg>
                            </div>
                            <div className="contact-name">
                                {contact.name ? contact.name : '+' + contact.id.split('@')[0]}
                            </div>
                        </div>
                    )}
                </div>

            </div>
            {user ? <div className="chat-dialog">
                <div className='chat-dialog-header'>
                    <div className="chat-dialog-header-avatar">
                        <svg viewBox="0 0 212 212" height="212" width="212" preserveAspectRatio="xMidYMid meet"
                             version="1.1" x="0px" y="0px">
                            <path fill="#FFFFFF" className="primary"
                                  d="M173.561,171.615c-0.601-0.915-1.287-1.907-2.065-2.955c-0.777-1.049-1.645-2.155-2.608-3.299 c-0.964-1.144-2.024-2.326-3.184-3.527c-1.741-1.802-3.71-3.646-5.924-5.47c-2.952-2.431-6.339-4.824-10.204-7.026 c-1.877-1.07-3.873-2.092-5.98-3.055c-0.062-0.028-0.118-0.059-0.18-0.087c-9.792-4.44-22.106-7.529-37.416-7.529 s-27.624,3.089-37.416,7.529c-0.338,0.153-0.653,0.318-0.985,0.474c-1.431,0.674-2.806,1.376-4.128,2.101 c-0.716,0.393-1.417,0.792-2.101,1.197c-3.421,2.027-6.475,4.191-9.15,6.395c-2.213,1.823-4.182,3.668-5.924,5.47 c-1.161,1.201-2.22,2.384-3.184,3.527c-0.964,1.144-1.832,2.25-2.609,3.299c-0.778,1.049-1.464,2.04-2.065,2.955 c-0.557,0.848-1.033,1.622-1.447,2.324c-0.033,0.056-0.073,0.119-0.104,0.174c-0.435,0.744-0.79,1.392-1.07,1.926 c-0.559,1.068-0.818,1.678-0.818,1.678v0.398c18.285,17.927,43.322,28.985,70.945,28.985c27.678,0,52.761-11.103,71.055-29.095 v-0.289c0,0-0.619-1.45-1.992-3.778C174.594,173.238,174.117,172.463,173.561,171.615z"></path>
                            <path fill="#FFFFFF" className="primary"
                                  d="M106.002,125.5c2.645,0,5.212-0.253,7.68-0.737c1.234-0.242,2.443-0.542,3.624-0.896 c1.772-0.532,3.482-1.188,5.12-1.958c2.184-1.027,4.242-2.258,6.15-3.67c2.863-2.119,5.39-4.646,7.509-7.509 c0.706-0.954,1.367-1.945,1.98-2.971c0.919-1.539,1.729-3.155,2.422-4.84c0.462-1.123,0.872-2.277,1.226-3.458 c0.177-0.591,0.341-1.188,0.49-1.792c0.299-1.208,0.542-2.443,0.725-3.701c0.275-1.887,0.417-3.827,0.417-5.811 c0-1.984-0.142-3.925-0.417-5.811c-0.184-1.258-0.426-2.493-0.725-3.701c-0.15-0.604-0.313-1.202-0.49-1.793 c-0.354-1.181-0.764-2.335-1.226-3.458c-0.693-1.685-1.504-3.301-2.422-4.84c-0.613-1.026-1.274-2.017-1.98-2.971 c-2.119-2.863-4.646-5.39-7.509-7.509c-1.909-1.412-3.966-2.643-6.15-3.67c-1.638-0.77-3.348-1.426-5.12-1.958 c-1.181-0.355-2.39-0.655-3.624-0.896c-2.468-0.484-5.035-0.737-7.68-0.737c-21.162,0-37.345,16.183-37.345,37.345 C68.657,109.317,84.84,125.5,106.002,125.5z"></path>
                        </svg>
                    </div>
                    <div className='chat-dialog-header-name'>
                        {user.name ? user.name : '+' + user.id.split('@')[0]}
                    </div>
                </div>
                <div className='chat-dialog-items'>
                    {chatMessage.map((item, index) =>
                        <div key={item.idMessage ? item.idMessage : index}
                             className={item.type === 'incoming' ? 'chat-dialog-item incoming' : 'chat-dialog-item outgoing'}>
                            <div className={item.type === 'incoming' ? 'incoming' : 'outgoing'}>
                        <span className='chat-span'>
                            {item.textMessage}
                            </span>
                            </div>
                        </div>
                    )}
                    <div ref={divRef}/>
                </div>
                <div className='chat-dialog-actions'>
                    <input type="text" className='chat-dialog-actions-input'
                           value={message}
                           onChange={handleChangeMessage}
                           placeholder='Введите сообщение'/>
                    <button className='chat-dialog-actions-button' disabled={!message} onClick={sendMessage}>Отправить
                    </button>
                </div>
            </div> : <div className="chat-dialog"></div>}
            {isPopup ?
                <div className="popup">
                    <div className="popup-block">
                        <div className="popup-input">
                            <input type="text" value={phone} onChange={handlePhoneChange}
                                   placeholder='Введите номер телефона'/>
                        </div>
                        {accountErr ? <div className="popup-error">Введен неверный номер телефона или пользователь не
                            зарегистрирован в системе</div> : ''}
                        <div className="popup-button">
                            <button className="popup-btn btn-create" onClick={createChat}>Создать новый чат</button>
                            <button className="popup-btn btn-cancel" onClick={showPopupFunc}>Отменить</button>
                        </div>
                    </div>
                </div>
                : ''}
        </div>
    );
};

export default ChatComponent;