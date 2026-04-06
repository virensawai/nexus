import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { toast } from './Toast';

const QRModals = ({ type, onClose }) => {
  const { me, apiFetch, setMe } = useAuth();
  const [scannedUser, setScannedUser] = useState(null);
  const [manualQR, setManualQR] = useState('');
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (type === 'scanner') {
      startCamera();
    }
    return () => stopCamera();
  }, [type]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      intervalRef.current = setInterval(scanFrame, 200);
    } catch (e) {
      setError('Camera not available. Use manual input.');
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code?.data) {
      stopCamera();
      processQRCode(code.data);
    }
  };

  const processQRCode = async (qrValue) => {
    try {
      const res = await apiFetch(`/connect/${qrValue}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScannedUser(data);
    } catch (e) {
      setError(e.message);
      startCamera(); // Restart scan if failed
    }
  };

  const confirmConnect = async () => {
    try {
      const res = await apiFetch('/connect', 'POST', { targetQR: scannedUser.qrCode });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMe(prev => ({
        ...prev,
        connections: [...(prev.connections || []), { ...scannedUser, _id: scannedUser.id, isOnline: data.user?.isOnline || false }]
      }));
      toast(`Connected with ${scannedUser.username}!`);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {type === 'my_qr' ? (
          <>
            <h2 className="modal-title">Your QR Code</h2>
            <p className="modal-sub">Share this with someone to connect</p>
            <div className="qr-wrapper">
              <QRCodeSVG value={me.qrCode || 'fallback'} size={200} bgColor="#ffffff" fgColor="#050810" level="H" />
            </div>
            <div className="qr-uid">{me.qrCode || 'Loading QR Code...'}</div>
            <p className="modal-note">Only people who scan this can connect to you</p>
          </>
        ) : (
          <>
            <h2 className="modal-title">Scan QR Code</h2>
            <p className="modal-sub">Point camera at someone's Nexus QR code</p>
            
            <div className="scanner-box">
              <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              <div className="scanner-frame">
                <div className="corner tl"></div><div className="corner tr"></div>
                <div className="corner bl"></div><div className="corner br"></div>
                <div className="scan-line"></div>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}
            
            {scannedUser && (
              <div className="scanner-result">
                <div className="result-avatar">{scannedUser.username[0].toUpperCase()}</div>
                <div className="result-info">
                  <span>{scannedUser.username}</span>
                  <span className="result-sub">Found!</span>
                </div>
                <button className="btn-primary small" onClick={confirmConnect}>Connect</button>
              </div>
            )}

            <div className="scanner-manual">
              <p>Or enter QR code manually:</p>
              <div className="manual-row">
                <input type="text" placeholder="Paste QR code UUID…" value={manualQR} onChange={e => setManualQR(e.target.value)} />
                <button className="btn-secondary small" onClick={() => processQRCode(manualQR)}>Look up</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QRModals;
