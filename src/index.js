import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  initAuthCreds,
  Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { setupMessageHandler } from "./bot.js";
import { setupCronJobs } from "./cron.js";
import { config } from "./config.js";
import { setupProfilePictureChanger, stopProfilePictureChanger } from "./profilePicture.js";
import { testConnection } from "./db.js";
import { initDBAuthState, clearAllSessions } from "./sessionStore.js";
import { runMigrations } from "./migrate.js";
import { 
  startWebServer, 
  updateQR, 
  clearQR, 
  setConnected, 
  setDisconnected, 
  setSocketInstance, 
  clearPairingCode, 
  updatePairingCode,
  setConnectionState,
  broadcastStatus,
  setPairingCallback,
  setLogoutCallback
} from "./web.js";
import {
  initStealthMode,
  isStealthModeActive,
  cleanupStealthMode,
} from "./stealthMode.js";

const logger = pino({ level: "silent" });
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
const useDBSession = isRailway || process.env.USE_DB_SESSION === "true";

let currentSock = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 5000;

let pairingMode = null;
let pendingPairingPhone = null;

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

async function requestPairingCode(phoneNumber) {
  console.log(`[PAIRING] Request received for phone: ${phoneNumber}`);
  
  pendingPairingPhone = phoneNumber;
  pairingMode = "code";
  
  setConnectionState("requesting_pairing");
  broadcastStatus();
  
  if (currentSock) {
    try {
      currentSock.end();
    } catch (e) {
      console.log("[PAIRING] Socket cleanup:", e.message);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  connectToWhatsApp();
}

async function handleLogout() {
  console.log("[LOGOUT] Logout requested");
  
  if (currentSock) {
    try {
      await currentSock.logout();
    } catch (e) {
      console.log("[LOGOUT] Error during logout:", e.message);
    }
  }
  
  if (useDBSession) {
    await clearAllSessions();
    console.log("[LOGOUT] Database sessions cleared");
  } else {
    const fs = await import("fs");
    try {
      fs.rmSync("auth_info", { recursive: true, force: true });
      console.log("[LOGOUT] File sessions cleared");
    } catch (e) {
      console.log("[LOGOUT] Error clearing file sessions:", e.message);
    }
  }
  
  pairingMode = null;
  pendingPairingPhone = null;
  reconnectAttempts = 0;
  
  setDisconnected();
  clearQR();
  clearPairingCode();
  broadcastStatus();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  connectToWhatsApp();
}

setPairingCallback(requestPairingCode);
setLogoutCallback(handleLogout);

async function cleanupOldSocket() {
  if (currentSock) {
    try {
      console.log("[CLEANUP] Membersihkan socket lama...");
      currentSock.ev.removeAllListeners();
      currentSock.end();
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("[CLEANUP] Socket lama dibersihkan");
    } catch (e) {
      console.log("[CLEANUP] Error:", e.message);
    }
    currentSock = null;
  }
}

async function connectToWhatsApp() {
  if (isConnecting) {
    console.log("[CONNECT] Already connecting, skipping...");
    return;
  }
  
  isConnecting = true;
  setConnectionState("connecting");
  broadcastStatus();
  
  await cleanupOldSocket();
  
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error("[DB] Failed to connect to database. Retrying in 5 seconds...");
      isConnecting = false;
      setTimeout(connectToWhatsApp, RECONNECT_INTERVAL);
      return;
    }

    const { state, saveCreds } = await getAuthState();
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`[WA] Using WA version ${version.join(".")}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.ubuntu("Chrome"),
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      qrTimeout: 60000,
      defaultQueryTimeoutMs: 60000,
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
        reconnectAttempts = 0;
        
        if (pairingMode === "code" && pendingPairingPhone) {
          try {
            console.log(`\n====================================`);
            console.log(`[PAIRING] Requesting code for: ${pendingPairingPhone}`);
            console.log(`====================================\n`);
            
            setConnectionState("generating_code");
            broadcastStatus();
            
            const code = await sock.requestPairingCode(pendingPairingPhone);
            const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
            
            console.log(`[PAIRING] Code generated: ${formattedCode}`);
            updatePairingCode(formattedCode);
            setConnectionState("waiting_code");
            broadcastStatus();
            
            pairingMode = null;
            pendingPairingPhone = null;
          } catch (error) {
            console.error("[PAIRING] Error generating code:", error);
            
            pairingMode = null;
            pendingPairingPhone = null;
            
            console.log("\n[PAIRING] Falling back to QR code...\n");
            console.log("====================================");
            console.log("Scan QR Code di bawah ini dengan WhatsApp:");
            console.log("====================================\n");
            qrcode.generate(qr, { small: true });
            updateQR(qr);
            setConnectionState("waiting_scan");
            broadcastStatus();
          }
        } else {
          console.log("\n====================================");
          console.log("Scan QR Code di bawah ini dengan WhatsApp:");
          console.log("====================================\n");
          qrcode.generate(qr, { small: true });
          
          updateQR(qr);
          setConnectionState("waiting_scan");
          broadcastStatus();
          
          if (isRailway) {
            console.log("\n[RAILWAY] QR Code juga tersedia di logs Railway Dashboard");
          }
        }
      }

      if (connection === "close") {
        isConnecting = false;
        setDisconnected();
        clearQR();
        clearPairingCode();
        stopProfilePictureChanger();
        cleanupStealthMode();
        broadcastStatus();
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(
          `[CONNECT] Connection closed - Status: ${statusCode}, Reason: ${lastDisconnect?.error?.message || "unknown"}, Reconnect: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          reconnectAttempts++;
          
          if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(RECONNECT_INTERVAL * reconnectAttempts, 30000);
            console.log(`[CONNECT] Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            setConnectionState("reconnecting");
            broadcastStatus();
            
            setTimeout(() => {
              connectToWhatsApp();
            }, delay);
          } else {
            console.log("[CONNECT] Max reconnect attempts reached. Manual restart required.");
            setConnectionState("failed");
            broadcastStatus();
          }
        } else {
          console.log("[CONNECT] Logged out. Session cleared.");
          reconnectAttempts = 0;
          
          if (useDBSession) {
            await clearAllSessions();
            console.log("[CONNECT] Database session cleared.");
          } else {
            console.log("[CONNECT] Please delete auth_info folder and restart.");
          }
          
          setConnectionState("logged_out");
          broadcastStatus();
        }
      } else if (connection === "open") {
        isConnecting = false;
        reconnectAttempts = 0;
        pairingMode = null;
        pendingPairingPhone = null;
        
        clearQR();
        clearPairingCode();
        
        const user = sock.user;
        setConnected({
          owner: config.ownerNumber,
          target: config.targetNumber,
          user: user ? {
            id: user.id,
            name: user.name || user.verifiedName || "Unknown",
          } : null,
        });
        broadcastStatus();
        
        console.log("\n====================================");
        console.log("Bot WhatsApp terhubung!");
        console.log("====================================");
        console.log(`Environment: ${isRailway ? "Railway" : "Local/Replit"}`);
        console.log(`Session Storage: ${useDBSession ? "Database" : "File"}`);
        console.log(`Connected as: ${user?.name || user?.verifiedName || user?.id || "Unknown"}`);
        console.log(`Owner Number: ${config.ownerNumber}`);
        console.log(`Target Number: ${config.targetNumber}`);
        console.log(`Timezone: ${config.timezone}`);
        console.log(`Daily Report: 00:00 ${config.timezone}`);
        console.log("====================================\n");

        console.log("[INIT] Menunggu koneksi stabil (5 detik)...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (sock.user && currentSock === sock) {
          console.log("[INIT] Koneksi stabil, mengaktifkan fitur...");
          
          // STEALTH MODE DISABLED FOR DEBUGGING
          // try {
          //   initStealthMode(sock);
          //   console.log("[INIT] Stealth mode module ready");
          // } catch (e) {
          //   console.log("[INIT] Stealth mode init skipped:", e.message);
          // }
          
          setupMessageHandler(sock);
          setupCronJobs(sock);
          
          console.log("[INIT] Menunggu sebelum aktivasi PP changer (2 detik)...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (sock.user && currentSock === sock) {
            setupProfilePictureChanger(sock);
          }
          console.log("[INIT] Semua fitur aktif!");
        } else {
          console.log("[INIT] Koneksi terputus sebelum fitur diaktifkan");
        }
      }
    });

    return sock;
  } catch (error) {
    console.error("[CONNECT] Fatal error:", error);
    isConnecting = false;
    
    reconnectAttempts++;
    if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_INTERVAL * reconnectAttempts;
      console.log(`[CONNECT] Retrying in ${delay/1000}s...`);
      setTimeout(connectToWhatsApp, delay);
    }
  }
}

process.on("uncaughtException", (err) => {
  console.error("[PROCESS] Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[PROCESS] Unhandled rejection:", err);
});

async function main() {
  console.log("====================================");
  console.log("WhatsApp Checkpoint Bot v2.0");
  console.log("====================================");
  console.log(`Environment: ${isRailway ? "Railway" : "Local/Replit"}`);
  console.log(`Session Mode: ${useDBSession ? "Database" : "File"}`);
  console.log("====================================\n");
  
  try {
    console.log("[INIT] Running database migrations...");
    await runMigrations();
    console.log("[INIT] Migrations completed\n");
  } catch (err) {
    console.error("[INIT] Migration failed:", err.message);
    console.log("[INIT] Continuing anyway - tables may already exist\n");
  }
  
  console.log("[INIT] Starting web server...");
  startWebServer();
  
  console.log("[INIT] Connecting to WhatsApp...\n");
  await connectToWhatsApp();
}

main().catch((err) => {
  console.error("[INIT] Failed to start bot:", err);
  process.exit(1);
});
