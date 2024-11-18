import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  initAuthCreds,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { setupMessageHandler } from "./bot.js";
import { setupCronJobs } from "./cron.js";
import { config } from "./config.js";
import { testConnection } from "./db.js";
import { initDBAuthState } from "./sessionStore.js";
import { startWebServer, updateQR, clearQR, setConnected, setDisconnected, setSocketInstance, clearPairingCode, updatePairingCode, setPairingCallback } from "./web.js";

const logger = pino({ level: "silent" });
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
const useDBSession = isRailway || process.env.USE_DB_SESSION === "true";

let currentSock = null;
let pairingRequested = false;
let pendingPairingPhone = null;

startWebServer();

async function getAuthState() {
  if (useDBSession) {
    console.log("Using database session storage (Railway mode)");
    const { state, saveCreds } = await initDBAuthState();
    
    if (!state.creds) {
      state.creds = initAuthCreds();
    }
    
    return { state, saveCreds };
  } else {
    console.log("Using file-based session storage (Local mode)");
    return await useMultiFileAuthState("auth_info");
  }
}

async function requestPairingForPhone(phone) {
  pendingPairingPhone = phone;
  pairingRequested = true;
  
  if (currentSock) {
    try {
      currentSock.end();
    } catch (e) {}
  }
  
  setTimeout(() => {
    connectToWhatsApp();
  }, 1000);
}

setPairingCallback(requestPairingForPhone);

async function connectToWhatsApp() {
  const connected = await testConnection();
  if (!connected) {
    console.error("Failed to connect to database. Retrying in 5 seconds...");
    setTimeout(connectToWhatsApp, 5000);
    return;
  }

  const { state, saveCreds } = await getAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  currentSock = sock;
  setSocketInstance(sock);

  sock.ev.on("creds.update", async (creds) => {
    state.creds = creds;
    await saveCreds();
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (pairingRequested && pendingPairingPhone) {
        try {
          console.log(`\n====================================`);
          console.log(`Requesting pairing code for: ${pendingPairingPhone}`);
          console.log(`====================================\n`);
          
          const code = await sock.requestPairingCode(pendingPairingPhone);
          console.log(`Pairing code generated: ${code}`);
          updatePairingCode(code);
          
          pairingRequested = false;
          pendingPairingPhone = null;
        } catch (error) {
          console.error("Error requesting pairing code:", error);
          pairingRequested = false;
          pendingPairingPhone = null;
          
          console.log("\n====================================");
          console.log("Scan QR Code di bawah ini dengan WhatsApp:");
          console.log("====================================\n");
          qrcode.generate(qr, { small: true });
          updateQR(qr);
        }
      } else {
        console.log("\n====================================");
        console.log("Scan QR Code di bawah ini dengan WhatsApp:");
        console.log("====================================\n");
        qrcode.generate(qr, { small: true });
        
        updateQR(qr);
        
        if (isRailway) {
          console.log("\n[RAILWAY] QR Code juga tersedia di logs Railway Dashboard");
        }
      }
    }

    if (connection === "close") {
      setDisconnected();
      clearQR();
      clearPairingCode();
      
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(
        "Connection closed due to",
        lastDisconnect?.error?.message || "unknown reason",
        ", reconnecting:",
        shouldReconnect
      );

      if (shouldReconnect) {
        setTimeout(() => {
          connectToWhatsApp();
        }, 5000);
      } else {
        console.log("Logged out. Session will be reset on next restart.");
        if (useDBSession) {
          console.log("Database session will be cleared.");
        } else {
          console.log("Please delete auth_info folder and restart.");
        }
      }
    } else if (connection === "open") {
      pairingRequested = false;
      pendingPairingPhone = null;
      clearQR();
      setConnected({
        owner: config.ownerNumber,
        target: config.targetNumber,
      });
      
      console.log("\n====================================");
      console.log("Bot WhatsApp terhubung!");
      console.log("====================================");
      console.log(`Environment: ${isRailway ? "Railway" : "Local/Replit"}`);
      console.log(`Session Storage: ${useDBSession ? "Database" : "File"}`);
      console.log(`Owner Number: ${config.ownerNumber}`);
      console.log(`Target Number: ${config.targetNumber}`);
      console.log(`Timezone: ${config.timezone}`);
      console.log(`Daily Report: 00:00 ${config.timezone}`);
      console.log("====================================\n");

      setupMessageHandler(sock);
      setupCronJobs(sock);
    }
  });

  return sock;
}

console.log("====================================");
console.log("WhatsApp Checkpoint Bot");
console.log("====================================");
console.log(`Environment: ${isRailway ? "Railway" : "Local/Replit"}`);
console.log("Memulai bot...\n");

connectToWhatsApp().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
