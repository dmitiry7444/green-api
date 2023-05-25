import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {createBrowserRouter, RouterProvider,} from "react-router-dom";
import LoginComponent from "./components/login-component/login-component";
import ChatComponent from "./components/chat-component/chat-component";

const router = createBrowserRouter([
    {
        path: "/",
        element: <LoginComponent/>,
    },
    {
        path: "/chat",
        element: <ChatComponent/>,
    },
]);


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>
);

