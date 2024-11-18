let stealthModeEnabled = false;
let stealthSock = null;
let presenceInterval = null;
let originalMethods = {
  sendPresenceUpdate: null,
  readMessages: null,
  sendReceipt: null,
};
let isInitialized = false;

export function isStealthModeActive() {
  return stealthModeEnabled;
}

export function initStealthMode(sock) {
  if (isInitialized) {
    console.log("[STEALTH] Already initialized, skipping...");
    return;
  }
  
  stealthSock = sock;
  
  originalMethods.sendPresenceUpdate = sock.sendPresenceUpdate?.bind(sock);
  originalMethods.readMessages = sock.readMessages?.bind(sock);
  originalMethods.sendReceipt = sock.sendReceipt?.bind(sock);
  
  if (sock.sendPresenceUpdate) {
    sock.sendPresenceUpdate = async (type, toJid) => {
      if (stealthModeEnabled) {
        if (type === "composing" || type === "recording" || type === "available") {
          console.log(`[STEALTH] Blocked presence: ${type} -> ${toJid || "global"}`);
          return;
        }
      }
      if (originalMethods.sendPresenceUpdate) {
        return originalMethods.sendPresenceUpdate(type, toJid);
      }
    };
  }
  
  if (sock.readMessages) {
    sock.readMessages = async (keys) => {
      if (stealthModeEnabled) {
        console.log(`[STEALTH] Blocked readMessages for ${keys?.length || 0} message(s)`);
        return;
      }
      if (originalMethods.readMessages) {
        return originalMethods.readMessages(keys);
      }
    };
  }
  
  if (sock.sendReceipt) {
    sock.sendReceipt = async (jid, participant, messageIds, type) => {
      if (stealthModeEnabled) {
        if (type === "read" || type === "read-self") {
          console.log(`[STEALTH] Blocked sendReceipt (${type}) to ${jid}`);
          return;
        }
      }
      if (originalMethods.sendReceipt) {
        return originalMethods.sendReceipt(jid, participant, messageIds, type);
      }
    };
  }
  
  isInitialized = true;
  console.log("[STEALTH] Stealth mode module initialized with socket wrapper");
  console.log("[STEALTH] - sendPresenceUpdate: " + (sock.sendPresenceUpdate ? "wrapped" : "not available"));
  console.log("[STEALTH] - readMessages: " + (originalMethods.readMessages ? "wrapped" : "not available"));
  console.log("[STEALTH] - sendReceipt: " + (originalMethods.sendReceipt ? "wrapped" : "not available"));
}

export async function enableStealthMode(sock) {
  if (!isInitialized) {
    initStealthMode(sock);
  }
  
  stealthSock = sock;
  stealthModeEnabled = true;
  
  console.log("[STEALTH] Stealth mode ENABLED");
  console.log("[STEALTH] - Ghost Read: ON (read receipts blocked)");
  console.log("[STEALTH] - Ghost Online: ON (presence set to unavailable)");
  console.log("[STEALTH] - Ghost Typing: ON (typing indicators blocked)");
  console.log("[STEALTH] - Ghost Status View: ON (status views hidden)");
  
  await setGhostPresence();
  
  startPresenceLoop();
  
  return {
    success: true,
    message: "*Stealth Mode ACTIVATED*\n\n" +
      "Ghost Read: ON\n" +
      "Ghost Online: ON\n" +
      "Ghost Typing: ON\n\n" +
      "Fitur ini berlaku untuk:\n" +
      "- Aktivitas BOT (koneksi ini)\n" +
      "- Bot tidak mengirim centang biru\n" +
      "- Bot tidak terlihat online\n\n" +
      "⚠️ *PENTING:*\n" +
      "Stealth mode TIDAK bisa mengontrol aktivitas langsung di HP Anda!\n\n" +
      "Untuk menyembunyikan aktivitas di HP:\n" +
      "1. Buka WhatsApp > Settings > Privacy\n" +
      "2. Matikan 'Read Receipts'\n" +
      "3. Set 'Last Seen' ke 'Nobody'"
  };
}

export async function disableStealthMode(sock) {
  if (!isInitialized) {
    initStealthMode(sock);
  }
  
  stealthSock = sock;
  stealthModeEnabled = false;
  
  console.log("[STEALTH] Stealth mode DISABLED");
  console.log("[STEALTH] - All ghost features: OFF");
  
  stopPresenceLoop();
  
  try {
    if (originalMethods.sendPresenceUpdate) {
      await originalMethods.sendPresenceUpdate("available");
      console.log("[STEALTH] Presence set to available");
    }
  } catch (err) {
    console.error("[STEALTH] Error setting presence to available:", err.message);
  }
  
  return {
    success: true,
    message: "*Stealth Mode DEACTIVATED*\n\n" +
      "Semua fitur ghost dimatikan.\n\n" +
      "Sekarang:\n" +
      "- Read receipt normal (centang biru aktif)\n" +
      "- Presence normal (terlihat online)\n" +
      "- Typing indicator normal"
  };
}

async function setGhostPresence() {
  try {
    if (originalMethods.sendPresenceUpdate) {
      await originalMethods.sendPresenceUpdate("unavailable");
      console.log("[STEALTH] Presence set to unavailable (ghost mode)");
    }
  } catch (err) {
    console.error("[STEALTH] Error setting ghost presence:", err.message);
  }
}

function startPresenceLoop() {
  stopPresenceLoop();
  
  presenceInterval = setInterval(async () => {
    if (stealthModeEnabled && originalMethods.sendPresenceUpdate) {
      try {
        await originalMethods.sendPresenceUpdate("unavailable");
      } catch (err) {
        console.error("[STEALTH] Presence loop error:", err.message);
      }
    }
  }, 30000);
  
  console.log("[STEALTH] Presence loop started (every 30s)");
}

function stopPresenceLoop() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
    console.log("[STEALTH] Presence loop stopped");
  }
}

export function shouldBlockReadReceipt() {
  return stealthModeEnabled;
}

export function shouldBlockTypingIndicator() {
  return stealthModeEnabled;
}

export function shouldBlockStatusView() {
  return stealthModeEnabled;
}

export async function sendTypingIndicator(sock, chatId, isTyping) {
  if (stealthModeEnabled) {
    console.log(`[STEALTH] Blocked typing indicator for ${chatId}`);
    return false;
  }
  
  try {
    if (originalMethods.sendPresenceUpdate) {
      await originalMethods.sendPresenceUpdate(isTyping ? "composing" : "paused", chatId);
    }
  } catch (err) {
    console.error("[STEALTH] Error sending typing:", err.message);
  }
  return true;
}

export async function sendRecordingIndicator(sock, chatId, isRecording) {
  if (stealthModeEnabled) {
    console.log(`[STEALTH] Blocked recording indicator for ${chatId}`);
    return false;
  }
  
  try {
    if (originalMethods.sendPresenceUpdate) {
      await originalMethods.sendPresenceUpdate(isRecording ? "recording" : "paused", chatId);
    }
  } catch (err) {
    console.error("[STEALTH] Error sending recording:", err.message);
  }
  return true;
}

export function getStealthStatus() {
  return {
    enabled: stealthModeEnabled,
    features: {
      ghostRead: stealthModeEnabled,
      ghostOnline: stealthModeEnabled,
      ghostTyping: stealthModeEnabled,
      ghostStatusView: stealthModeEnabled
    }
  };
}

export function getStealthConfig() {
  return {
    markOnlineOnConnect: !stealthModeEnabled,
    syncFullHistory: false,
  };
}

export function cleanupStealthMode() {
  stopPresenceLoop();
  stealthModeEnabled = false;
  
  if (stealthSock && isInitialized) {
    if (originalMethods.sendPresenceUpdate) {
      stealthSock.sendPresenceUpdate = originalMethods.sendPresenceUpdate;
      console.log("[STEALTH] Restored sendPresenceUpdate");
    }
    if (originalMethods.readMessages) {
      stealthSock.readMessages = originalMethods.readMessages;
      console.log("[STEALTH] Restored readMessages");
    }
    if (originalMethods.sendReceipt) {
      stealthSock.sendReceipt = originalMethods.sendReceipt;
      console.log("[STEALTH] Restored sendReceipt");
    }
  }
  
  stealthSock = null;
  originalMethods = {
    sendPresenceUpdate: null,
    readMessages: null,
    sendReceipt: null,
  };
  isInitialized = false;
  console.log("[STEALTH] Stealth mode cleaned up");
}
