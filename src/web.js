import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import QRCode from "qrcode";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let currentQR = null;
let currentPairingCode = null;
let connectionStatus = "disconnected";
let connectionState = "idle";
let botInfo = null;
let socketInstance = null;
let pairingCallback = null;
let logoutCallback = null;
let connectedClients = new Set();

wss.on("connection", (ws) => {
  connectedClients.add(ws);
  console.log(`[WS] Client connected. Total: ${connectedClients.size}`);
  
  ws.send(JSON.stringify({
    type: "status",
    data: getStatusData()
  }));
  
  ws.on("close", () => {
    connectedClients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${connectedClients.size}`);
  });
  
  ws.on("error", (err) => {
    console.error("[WS] Client error:", err.message);
    connectedClients.delete(ws);
  });
});

function getStatusData() {
  return {
    status: connectionStatus,
    state: connectionState,
    hasQR: !!currentQR,
    hasPairingCode: !!currentPairingCode,
    pairingCode: currentPairingCode,
    botInfo,
    timestamp: Date.now()
  };
}

export function broadcastStatus() {
  const data = JSON.stringify({
    type: "status",
    data: getStatusData()
  });
  
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

async function broadcastQR() {
  if (!currentQR) return;
  
  try {
    const qrDataUrl = await QRCode.toDataURL(currentQR, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    
    const data = JSON.stringify({
      type: "qr",
      data: { qrDataUrl }
    });
    
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  } catch (err) {
    console.error("[WS] Error broadcasting QR:", err);
  }
}

export function updateQR(qrData) {
  currentQR = qrData;
  currentPairingCode = null;
  connectionStatus = "waiting_scan";
  broadcastQR();
  broadcastStatus();
}

export function clearQR() {
  currentQR = null;
}

export function updatePairingCode(code) {
  currentPairingCode = code;
  currentQR = null;
  connectionStatus = "waiting_code";
  broadcastStatus();
}

export function clearPairingCode() {
  currentPairingCode = null;
}

export function setConnected(info) {
  currentQR = null;
  currentPairingCode = null;
  connectionStatus = "connected";
  connectionState = "connected";
  botInfo = info;
  broadcastStatus();
}

export function setDisconnected() {
  connectionStatus = "disconnected";
  connectionState = "disconnected";
  botInfo = null;
}

export function setConnectionState(state) {
  connectionState = state;
}

export function setSocketInstance(sock) {
  socketInstance = sock;
}

export function getSocketInstance() {
  return socketInstance;
}

export function setPairingCallback(callback) {
  pairingCallback = callback;
}

export function getPairingCallback() {
  return pairingCallback;
}

export function setLogoutCallback(callback) {
  logoutCallback = callback;
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Bot - Connect</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #075e54 0%, #128c7e 50%, #25d366 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 450px;
      width: 100%;
      position: relative;
      overflow: hidden;
    }
    
    .container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #25d366, #128c7e, #075e54);
    }
    
    h1 {
      color: #075e54;
      margin-bottom: 8px;
      font-size: 26px;
      font-weight: 700;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    
    .connection-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 25px;
    }
    
    .connection-indicator.connected { background: #d4edda; color: #155724; }
    .connection-indicator.disconnected { background: #f8d7da; color: #721c24; }
    .connection-indicator.waiting { background: #fff3cd; color: #856404; }
    .connection-indicator.connecting { background: #cce5ff; color: #004085; }
    
    .connection-indicator .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    .connection-indicator.connected .dot { background: #28a745; }
    .connection-indicator.disconnected .dot { background: #dc3545; }
    .connection-indicator.waiting .dot { background: #ffc107; animation: pulse 1.5s infinite; }
    .connection-indicator.connecting .dot { background: #007bff; animation: pulse 1s infinite; }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    
    .tabs {
      display: flex;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 25px;
      background: #f0f0f0;
    }
    
    .tab {
      flex: 1;
      padding: 14px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;
      color: #666;
    }
    
    .tab:hover { background: rgba(7,94,84,0.1); }
    
    .tab.active {
      background: #075e54;
      color: white;
    }
    
    .tab-content { display: none; animation: fadeIn 0.3s; }
    .tab-content.active { display: block; }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .qr-container {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 16px;
      display: inline-block;
      border: 2px dashed #ddd;
    }
    
    .qr-container img {
      display: block;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .qr-placeholder {
      width: 280px;
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
    }
    
    .scan-text {
      margin-top: 20px;
      color: #075e54;
      font-weight: 600;
      font-size: 15px;
    }
    
    .pairing-form {
      padding: 20px 0;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      text-align: left;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .form-group input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #075e54;
      box-shadow: 0 0 0 3px rgba(7,94,84,0.1);
    }
    
    .form-hint {
      font-size: 12px;
      color: #888;
      margin-top: 6px;
      text-align: left;
    }
    
    .btn {
      display: inline-block;
      padding: 14px 28px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s;
      width: 100%;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #075e54, #128c7e);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(7,94,84,0.3);
    }
    
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
      margin-top: 15px;
    }
    
    .btn-danger:hover {
      background: #c82333;
    }
    
    .pairing-result {
      background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
      padding: 30px;
      border-radius: 16px;
      margin-top: 20px;
    }
    
    .pairing-result h3 {
      color: #075e54;
      margin-bottom: 15px;
      font-size: 16px;
    }
    
    .pairing-code {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #075e54;
      font-family: 'Courier New', monospace;
      background: white;
      padding: 15px 25px;
      border-radius: 10px;
      display: inline-block;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .pairing-steps {
      text-align: left;
      margin-top: 20px;
      color: #555;
      font-size: 13px;
      line-height: 1.8;
    }
    
    .pairing-steps ol { padding-left: 20px; }
    .pairing-steps li { margin-bottom: 5px; }
    
    .status {
      padding: 40px 20px;
    }
    
    .status-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin: 0 auto 20px;
    }
    
    .status.connected .status-icon {
      background: linear-gradient(135deg, #25d366, #128c7e);
      color: white;
    }
    
    .status h2 { color: #075e54; margin-bottom: 10px; }
    .status p { color: #666; font-size: 14px; margin-bottom: 5px; }
    
    .user-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 10px;
      margin-top: 15px;
    }
    
    .user-info .name {
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    
    .loader-container {
      padding: 40px 20px;
    }
    
    .loader {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #075e54;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #999;
      font-size: 12px;
    }
    
    .footer a {
      color: #075e54;
      text-decoration: none;
    }
    
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WhatsApp Bot</h1>
    <p class="subtitle">Checkpoint Counter & Automation</p>
    
    <div id="connectionIndicator" class="connection-indicator disconnected">
      <span class="dot"></span>
      <span id="statusText">Disconnected</span>
    </div>
    
    <div id="mainContent">
      <!-- Connected State -->
      <div id="connectedView" class="status connected hidden">
        <div class="status-icon">✓</div>
        <h2>Bot Terhubung!</h2>
        <div id="userInfoContainer" class="user-info hidden">
          <div class="name" id="userName"></div>
        </div>
        <p style="margin-top: 15px;">Bot aktif dan siap menerima pesan</p>
        <button type="button" class="btn btn-danger" onclick="requestLogout()">Logout</button>
      </div>
      
      <!-- Loading State -->
      <div id="loadingView" class="loader-container hidden">
        <div class="loader"></div>
        <p id="loadingText">Menghubungkan...</p>
      </div>
      
      <!-- Login Options -->
      <div id="loginView" class="hidden">
        <div class="tabs">
          <button class="tab active" onclick="switchTab('qr')">QR Code</button>
          <button class="tab" onclick="switchTab('pairing')">Kode Pairing</button>
        </div>
        
        <!-- QR Tab -->
        <div id="qrTab" class="tab-content active">
          <div class="qr-container">
            <div id="qrPlaceholder" class="qr-placeholder">
              <span>Memuat QR Code...</span>
            </div>
            <img id="qrImage" src="" alt="QR Code" style="display: none;" />
          </div>
          <p class="scan-text">Scan dengan WhatsApp di HP kamu</p>
        </div>
        
        <!-- Pairing Tab -->
        <div id="pairingTab" class="tab-content">
          <div id="pairingForm" class="pairing-form">
            <div class="form-group">
              <label>Nomor WhatsApp</label>
              <input type="tel" id="phoneInput" placeholder="628xxxxxxxxxx" pattern="[0-9]{10,15}" />
              <p class="form-hint">Masukkan nomor tanpa tanda + atau spasi. Contoh: 6281234567890</p>
            </div>
            <button type="button" class="btn btn-primary" id="pairingBtn" onclick="requestPairing()">
              Dapatkan Kode
            </button>
          </div>
          
          <div id="pairingResult" class="pairing-result hidden">
            <h3>Kode Pairing Kamu</h3>
            <div class="pairing-code" id="pairingCodeDisplay"></div>
            <div class="pairing-steps">
              <ol>
                <li>Buka WhatsApp di HP</li>
                <li>Ketuk Menu ⋮ > Perangkat Tertaut</li>
                <li>Ketuk "Tautkan Perangkat"</li>
                <li>Pilih "Tautkan dengan nomor telepon"</li>
                <li>Masukkan kode di atas</li>
              </ol>
            </div>
            <button type="button" class="btn btn-primary" onclick="resetPairing()" style="margin-top: 20px;">
              Minta Kode Baru
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      WhatsApp Checkpoint Bot v2.0
    </div>
  </div>
  
  <script>
    let ws;
    let reconnectTimer;
    let currentTab = 'qr';
    
    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + window.location.host);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        clearTimeout(reconnectTimer);
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'status') {
          handleStatusUpdate(message.data);
        } else if (message.type === 'qr') {
          handleQRUpdate(message.data);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    }
    
    function handleStatusUpdate(data) {
      const indicator = document.getElementById('connectionIndicator');
      const statusText = document.getElementById('statusText');
      const connectedView = document.getElementById('connectedView');
      const loadingView = document.getElementById('loadingView');
      const loginView = document.getElementById('loginView');
      const loadingText = document.getElementById('loadingText');
      
      indicator.className = 'connection-indicator';
      
      if (data.status === 'connected') {
        indicator.classList.add('connected');
        statusText.textContent = 'Connected';
        
        connectedView.classList.remove('hidden');
        loadingView.classList.add('hidden');
        loginView.classList.add('hidden');
        
        if (data.botInfo && data.botInfo.user) {
          document.getElementById('userName').textContent = data.botInfo.user.name || 'Bot Connected';
          document.getElementById('userInfoContainer').classList.remove('hidden');
        }
      } else if (data.state === 'connecting' || data.state === 'reconnecting') {
        indicator.classList.add('connecting');
        statusText.textContent = data.state === 'reconnecting' ? 'Reconnecting...' : 'Connecting...';
        
        connectedView.classList.add('hidden');
        loadingView.classList.remove('hidden');
        loginView.classList.add('hidden');
        loadingText.textContent = data.state === 'reconnecting' ? 'Menghubungkan kembali...' : 'Menghubungkan...';
      } else if (data.state === 'generating_code' || data.state === 'requesting_pairing') {
        indicator.classList.add('waiting');
        statusText.textContent = 'Generating Code...';
        
        connectedView.classList.add('hidden');
        loadingView.classList.remove('hidden');
        loginView.classList.add('hidden');
        loadingText.textContent = 'Membuat kode pairing...';
      } else if (data.status === 'waiting_code' && data.pairingCode) {
        indicator.classList.add('waiting');
        statusText.textContent = 'Waiting for Code Entry';
        
        connectedView.classList.add('hidden');
        loadingView.classList.add('hidden');
        loginView.classList.remove('hidden');
        
        document.getElementById('pairingForm').classList.add('hidden');
        document.getElementById('pairingResult').classList.remove('hidden');
        document.getElementById('pairingCodeDisplay').textContent = data.pairingCode;
        
        switchTab('pairing');
      } else if (data.status === 'waiting_scan' || data.hasQR) {
        indicator.classList.add('waiting');
        statusText.textContent = 'Waiting for Scan';
        
        connectedView.classList.add('hidden');
        loadingView.classList.add('hidden');
        loginView.classList.remove('hidden');
        
        document.getElementById('pairingForm').classList.remove('hidden');
        document.getElementById('pairingResult').classList.add('hidden');
      } else {
        indicator.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
        
        connectedView.classList.add('hidden');
        loadingView.classList.remove('hidden');
        loginView.classList.add('hidden');
        loadingText.textContent = 'Menunggu koneksi...';
      }
    }
    
    function handleQRUpdate(data) {
      const qrImage = document.getElementById('qrImage');
      const qrPlaceholder = document.getElementById('qrPlaceholder');
      
      if (data.qrDataUrl) {
        qrImage.src = data.qrDataUrl;
        qrImage.style.display = 'block';
        qrPlaceholder.style.display = 'none';
      }
    }
    
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      if (tab === 'qr') {
        document.querySelector('.tab:first-child').classList.add('active');
        document.getElementById('qrTab').classList.add('active');
      } else {
        document.querySelector('.tab:last-child').classList.add('active');
        document.getElementById('pairingTab').classList.add('active');
      }
    }
    
    async function requestPairing() {
      const phone = document.getElementById('phoneInput').value.trim();
      const btn = document.getElementById('pairingBtn');
      
      if (!phone || phone.length < 10) {
        alert('Masukkan nomor WhatsApp yang valid');
        return;
      }
      
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      
      btn.disabled = true;
      btn.textContent = 'Memproses...';
      
      try {
        const response = await fetch('/api/request-pairing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          alert(result.error || 'Gagal meminta kode pairing');
          btn.disabled = false;
          btn.textContent = 'Dapatkan Kode';
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Terjadi kesalahan. Coba lagi.');
        btn.disabled = false;
        btn.textContent = 'Dapatkan Kode';
      }
    }
    
    function resetPairing() {
      document.getElementById('pairingForm').classList.remove('hidden');
      document.getElementById('pairingResult').classList.add('hidden');
      document.getElementById('phoneInput').value = '';
      document.getElementById('pairingBtn').disabled = false;
      document.getElementById('pairingBtn').textContent = 'Dapatkan Kode';
    }
    
    async function requestLogout() {
      if (!confirm('Apakah kamu yakin ingin logout? Bot akan terputus dari WhatsApp.')) {
        return;
      }
      
      try {
        const response = await fetch('/api/logout', { method: 'POST' });
        const result = await response.json();
        
        if (!result.success) {
          alert(result.error || 'Gagal logout');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Terjadi kesalahan. Coba lagi.');
      }
    }
    
    document.getElementById('phoneInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') requestPairing();
    });
    
    connectWebSocket();
  </script>
</body>
</html>
`;

app.get("/", async (req, res) => {
  res.send(htmlTemplate);
});

app.post("/api/request-pairing", async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.json({ success: false, error: "Nomor telepon tidak boleh kosong" });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.json({ success: false, error: "Nomor telepon tidak valid" });
  }

  try {
    if (pairingCallback) {
      console.log(`[API] Requesting pairing code for: ${cleanPhone}`);
      await pairingCallback(cleanPhone);
      return res.json({ success: true, message: "Permintaan kode pairing sedang diproses" });
    } else {
      console.error("[API] Pairing callback not set");
      return res.json({ success: false, error: "Sistem belum siap. Coba lagi." });
    }
  } catch (error) {
    console.error("[API] Error requesting pairing code:", error);
    return res.json({ success: false, error: "Gagal meminta kode pairing" });
  }
});

app.post("/api/logout", async (req, res) => {
  try {
    if (logoutCallback) {
      console.log("[API] Logout requested");
      await logoutCallback();
      return res.json({ success: true, message: "Logout berhasil" });
    } else {
      return res.json({ success: false, error: "Sistem belum siap" });
    }
  } catch (error) {
    console.error("[API] Error during logout:", error);
    return res.json({ success: false, error: "Gagal logout" });
  }
});

app.get("/api/status", (req, res) => {
  res.json(getStatusData());
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

export function startWebServer() {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server berjalan di http://0.0.0.0:${PORT}`);
  });
}
