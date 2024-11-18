import express from "express";
import QRCode from "qrcode";

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let currentQR = null;
let currentPairingCode = null;
let connectionStatus = "disconnected";
let botInfo = null;
let socketInstance = null;

export function updateQR(qrData) {
  currentQR = qrData;
  currentPairingCode = null;
  connectionStatus = "waiting_scan";
}

export function clearQR() {
  currentQR = null;
}

export function updatePairingCode(code) {
  currentPairingCode = code;
  currentQR = null;
  connectionStatus = "waiting_code";
}

export function clearPairingCode() {
  currentPairingCode = null;
}

export function setConnected(info) {
  currentQR = null;
  currentPairingCode = null;
  connectionStatus = "connected";
  botInfo = info;
}

export function setDisconnected() {
  connectionStatus = "disconnected";
  botInfo = null;
}

export function setSocketInstance(sock) {
  socketInstance = sock;
}

export function getSocketInstance() {
  return socketInstance;
}

app.get("/", async (req, res) => {
  let contentHtml = "";
  
  if (connectionStatus === "connected") {
    contentHtml = `
      <div class="status connected">
        <div class="status-icon">✓</div>
        <h2>Bot Terhubung!</h2>
        ${botInfo ? `<p>Owner: ${botInfo.owner}</p>` : ""}
      </div>
    `;
  } else if (currentPairingCode) {
    contentHtml = `
      <div class="pairing-container">
        <h2>Kode Pairing</h2>
        <div class="pairing-code">${currentPairingCode}</div>
        <p class="pairing-instruction">
          Buka WhatsApp di HP<br>
          Menu ⋮ → <b>Perangkat Tertaut</b><br>
          → <b>Tautkan Perangkat</b><br>
          → <b>Tautkan dengan nomor telepon</b><br>
          Masukkan kode di atas
        </p>
        <a href="/" class="btn btn-secondary">Kembali ke QR Code</a>
      </div>
    `;
  } else if (currentQR) {
    try {
      const qrDataUrl = await QRCode.toDataURL(currentQR, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      contentHtml = `
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="QR Code" />
          <p class="scan-text">Scan dengan WhatsApp</p>
        </div>
        <div class="divider">
          <span>atau</span>
        </div>
        <div class="pairing-form">
          <p class="form-title">Login dengan Kode 8 Digit</p>
          <form action="/request-pairing" method="POST">
            <input type="tel" name="phone" placeholder="Nomor HP (628xxx)" required pattern="[0-9]{10,15}" />
            <button type="submit" class="btn btn-primary">Dapatkan Kode</button>
          </form>
          <p class="form-hint">Contoh: 6281234567890</p>
        </div>
      `;
    } catch (err) {
      contentHtml = `<p class="error">Error generating QR code</p>`;
    }
  } else {
    contentHtml = `
      <div class="status waiting">
        <div class="loader"></div>
        <p>Menunggu koneksi...</p>
        <p class="hint">Halaman akan refresh otomatis</p>
      </div>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${connectionStatus !== "waiting_code" ? '<meta http-equiv="refresh" content="5">' : ''}
  <title>WhatsApp Checkpoint Bot</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #075e54 0%, #128c7e 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 420px;
      width: 100%;
    }
    
    h1 {
      color: #075e54;
      margin-bottom: 10px;
      font-size: 24px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    
    .qr-container {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 12px;
      display: inline-block;
    }
    
    .qr-container img {
      display: block;
      border-radius: 8px;
    }
    
    .scan-text {
      margin-top: 15px;
      color: #075e54;
      font-weight: 600;
    }
    
    .divider {
      display: flex;
      align-items: center;
      margin: 25px 0;
    }
    
    .divider::before,
    .divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #ddd;
    }
    
    .divider span {
      padding: 0 15px;
      color: #999;
      font-size: 14px;
    }
    
    .pairing-form {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
    }
    
    .form-title {
      color: #333;
      font-weight: 600;
      margin-bottom: 15px;
    }
    
    .pairing-form input {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .pairing-form input:focus {
      outline: none;
      border-color: #075e54;
    }
    
    .form-hint {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
    
    .btn {
      display: inline-block;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #075e54;
      color: white;
      width: 100%;
    }
    
    .btn-primary:hover {
      background: #064e46;
    }
    
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      margin-top: 15px;
    }
    
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    
    .pairing-container {
      padding: 20px 0;
    }
    
    .pairing-container h2 {
      color: #075e54;
      margin-bottom: 20px;
    }
    
    .pairing-code {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #075e54;
      background: #e8f5e9;
      padding: 20px 30px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 20px;
      font-family: 'Courier New', monospace;
    }
    
    .pairing-instruction {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
      margin-bottom: 10px;
    }
    
    .status {
      padding: 40px 20px;
    }
    
    .status.connected {
      color: #075e54;
    }
    
    .status-icon {
      width: 80px;
      height: 80px;
      background: #25d366;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: white;
      margin: 0 auto 20px;
    }
    
    .status.waiting {
      color: #666;
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
    
    .hint {
      font-size: 12px;
      color: #999;
      margin-top: 10px;
    }
    
    .error {
      color: #e74c3c;
      padding: 20px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>WhatsApp Checkpoint Bot</h1>
    <p class="subtitle">Bot penghitung pesan grup</p>
    ${contentHtml}
    <div class="footer">
      Status: ${connectionStatus === "connected" ? "Terhubung" : connectionStatus === "waiting_scan" ? "Menunggu Scan QR" : connectionStatus === "waiting_code" ? "Menunggu Kode Pairing" : "Menunggu..."}
    </div>
  </div>
</body>
</html>
  `;

  res.send(html);
});

app.post("/request-pairing", async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.redirect("/?error=no_phone");
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.redirect("/?error=invalid_phone");
  }

  try {
    const sock = getSocketInstance();
    if (sock && sock.requestPairingCode) {
      const code = await sock.requestPairingCode(cleanPhone);
      updatePairingCode(code);
      console.log(`Pairing code generated for ${cleanPhone}: ${code}`);
    } else {
      console.error("Socket not available or pairing not supported");
    }
  } catch (error) {
    console.error("Error requesting pairing code:", error);
  }
  
  res.redirect("/");
});

app.get("/status", (req, res) => {
  res.json({
    status: connectionStatus,
    hasQR: !!currentQR,
    hasPairingCode: !!currentPairingCode,
    botInfo,
  });
});

export function startWebServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server berjalan di http://0.0.0.0:${PORT}`);
  });
}
