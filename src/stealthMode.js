let stealthModeEnabled = false;
let stealthSock = null;
let presenceInterval = null;
let originalMethods = {
  sendPresenceUpdate: null,
  readMessages: null,
  sendReadReceipt: null,
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
  originalMethods.sendReadReceipt = sock.sendReadReceipt?.bind(sock);
  
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
  
  if (sock.sendReadReceipt) {
    sock.sendReadReceipt = async (jid, participant, messageKeys) => {
      if (stealthModeEnabled) {
        console.log(`[STEALTH] Blocked sendReadReceipt to ${jid}`);
        return;
      }
      if (originalMethods.sendReadReceipt) {
        return originalMethods.sendReadReceipt(jid, participant, messageKeys);
      }
    };
  }
  
  isInitialized = true;
  console.log("[STEALTH] Stealth mode module initialized with socket wrapper");
  console.log("[STEALTH] - sendPresenceUpdate: wrapped");
  console.log("[STEALTH] - readMessages: " + (sock.readMessages ? "wrapped" : "not available"));
  console.log("[STEALTH] - sendReadReceipt: " + (sock.sendReadReceipt ? "wrapped" : "not available"));
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
      "Ghost Typing: ON\n" +
      "Ghost Status View: ON\n\n" +
      "Anda sekarang:\n" +
      "- Tidak mengirim centang biru\n" +
      "- Tidak terlihat online\n" +
      "- Tidak mengirim indikator mengetik\n" +
      "- Bisa melihat status tanpa ketahuan"
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
    if (originalMethods.sendReadReceipt) {
      stealthSock.sendReadReceipt = originalMethods.sendReadReceipt;
      console.log("[STEALTH] Restored sendReadReceipt");
    }
  }
  
  stealthSock = null;
  originalMethods = {
    sendPresenceUpdate: null,
    readMessages: null,
    sendReadReceipt: null,
  };
  isInitialized = false;
  console.log("[STEALTH] Stealth mode cleaned up");
}
