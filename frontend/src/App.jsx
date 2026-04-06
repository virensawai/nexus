import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Toast from './components/Toast';
import './index.css';

const MainScreen = () => {
  const { me, loading } = useAuth();
  
  if (loading) return null; // Or a nice custom loader
  
  if (!me) {
    return <AuthScreen />;
  }
  
  return (
    <SocketProvider>
      <div id="app-screen" className="screen active">
        <Sidebar />
        <ChatArea />
      </div>
    </SocketProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      <div className="grid-overlay"></div>
      <MainScreen />
      <Toast />
    </AuthProvider>
  );
};

export default App;
