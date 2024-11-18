import express from "express";
import QRCode from "qrcode";

const app = express();
const PORT = 5000;

let currentQR = null;
let connectionStatus = "disconnected";
let botInfo = null;

export function updateQR(qrData) {
  currentQR = qrData;
  connectionStatus = "waiting_scan";
}

export function clearQR() {
  currentQR = null;
}

export function setConnected(info) {
  currentQR = null;
  connectionStatus = "connected";
  botInfo = info;
}

export function setDisconnected() {
  connectionStatus = "disconnected";
  botInfo = null;
}

app.get("/", async (req, res) => {
  let qrImageHtml = "";
  
  if (connectionStatus === "connected") {
    qrImageHtml = `
      <div class="status connected">
        <div class="status-icon">✓</div>
        <h2>Bot Terhubung!</h2>
        ${botInfo ? `<p>Owner: ${botInfo.owner}</p>` : ""}
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
      qrImageHtml = `
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="QR Code" />
          <p class="scan-text">Scan dengan WhatsApp</p>
        </div>
      `;
    } catch (err) {
      qrImageHtml = `<p class="error">Error generating QR code</p>`;
    }
  } else {
    qrImageHtml = `
      <div class="status waiting">
        <div class="loader"></div>
        <p>Menunggu QR Code...</p>
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
  <meta http-equiv="refresh" content="5">
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
      max-width: 400px;
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
    ${qrImageHtml}
    <div class="footer">
      Status: ${connectionStatus === "connected" ? "Terhubung" : connectionStatus === "waiting_scan" ? "Menunggu Scan" : "Menunggu..."}
    </div>
  </div>
</body>
</html>
  `;

  res.send(html);
});

app.get("/status", (req, res) => {
  res.json({
    status: connectionStatus,
    hasQR: !!currentQR,
    botInfo,
  });
});

export function startWebServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server berjalan di http://0.0.0.0:${PORT}`);
  });
}
