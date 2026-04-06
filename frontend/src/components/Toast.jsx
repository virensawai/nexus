import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

// Expose a global hook provider we add to App.jsx (already in App.jsx via Toast component rendered at top)
// but let's just make Toast a global pub/sub for simplicity without context nesting too much

let globalToastFn = null;

export const toast = (msg, type = 'success') => {
  if (globalToastFn) globalToastFn(msg, type);
};

const Toast = () => {
  const [toastData, setToastData] = useState({ msg: '', type: 'success', visible: false });

  React.useEffect(() => {
    let timer;
    globalToastFn = (msg, type) => {
      setToastData({ msg, type, visible: true });
      clearTimeout(timer);
      timer = setTimeout(() => setToastData(prev => ({ ...prev, visible: false })), 3000);
    };
    return () => { globalToastFn = null; clearTimeout(timer); };
  }, []);

  return (
    <div className={`toast ${toastData.type} ${!toastData.visible ? 'hidden' : ''}`}>
      {toastData.msg}
    </div>
  );
};

export default Toast;
