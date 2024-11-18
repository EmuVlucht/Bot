import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const TIMEZONE = "Asia/Jayapura";

let hariLiburNasional = {};
try {
  const liburPath = path.join(rootDir, "libur.json");
  const liburData = fs.readFileSync(liburPath, "utf8");
  hariLiburNasional = JSON.parse(liburData);
  console.log("[PP] Data hari libur nasional berhasil dimuat");
} catch (error) {
  console.log("[PP] File libur.json tidak ditemukan, fitur hari libur tidak aktif");
}

let currentPP = null;
let isChangingPP = false;
let ppCheckInterval = null;

function isHariLibur() {
  const now = moment.tz(TIMEZONE);
  const dayOfWeek = now.day();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  const currentDate = now.format("YYYY-MM-DD");
  return hariLiburNasional.hasOwnProperty(currentDate);
}

function getCurrentPPType() {
  const now = moment.tz(TIMEZONE);
  const hour = now.hour();

  if (isHariLibur()) {
    return "C";
  }

  if (hour === 12) {
    return "C";
  }

  if (hour >= 17 || hour < 5) {
    return "A";
  }

  if ((hour >= 5 && hour < 12) || (hour >= 13 && hour < 17)) {
    return "B";
  }

  return "B";
}

function getPPFileName(ppType) {
  const ppFiles = {
    A: "malam.png",
    B: "siang.png",
    C: "khusus.jpg",
  };
  return ppFiles[ppType] || "siang.png";
}

function getPPName(ppType) {
  const ppNames = {
    A: "PP Malam (17:00 - 05:00)",
    B: "PP Siang (05:00 - 17:00)",
    C: "PP Khusus (Libur/Jam 12)",
  };
  return ppNames[ppType] || "PP Default";
}

async function checkAndUpdatePP(sock) {
  if (isChangingPP || !sock) {
    return;
  }

  const ppType = getCurrentPPType();

  if (currentPP === ppType) {
    return;
  }

  const ppFileName = getPPFileName(ppType);
  const ppPath = path.join(rootDir, ppFileName);

  if (!fs.existsSync(ppPath)) {
    console.error(`[PP] File ${ppFileName} tidak ditemukan!`);
    return;
  }

  isChangingPP = true;

  try {
    const imageBuffer = fs.readFileSync(ppPath);
    
    const myJid = sock.user?.id;
    if (!myJid) {
      console.error("[PP] User JID tidak ditemukan");
      return;
    }
    
    await sock.updateProfilePicture(myJid, imageBuffer);

    currentPP = ppType;
    const ppName = getPPName(ppType);
    const now = moment.tz(TIMEZONE);

    console.log(`[PP] ${now.format("DD/MM/YYYY HH:mm:ss")} WIT`);
    console.log(`[PP] PP berhasil diganti ke: ${ppName} (${ppFileName})`);
  } catch (error) {
    console.error("[PP] Error mengganti PP:", error.message);
  } finally {
    isChangingPP = false;
  }
}

export function setupProfilePictureChanger(sock) {
  if (ppCheckInterval) {
    clearInterval(ppCheckInterval);
  }

  ppCheckInterval = setInterval(() => {
    checkAndUpdatePP(sock);
  }, 60000);

  checkAndUpdatePP(sock);

  console.log("[PP] Profile Picture Auto-Changer aktif");
  console.log("[PP] Jadwal:");
  console.log("     - PP Malam: 17:00 - 05:00 WIT");
  console.log("     - PP Siang: 05:00 - 12:00 & 13:00 - 17:00 WIT");
  console.log("     - PP Khusus: Jam 12, Weekend, Hari Libur Nasional");
}

export function stopProfilePictureChanger() {
  if (ppCheckInterval) {
    clearInterval(ppCheckInterval);
    ppCheckInterval = null;
    console.log("[PP] Profile Picture Auto-Changer dihentikan");
  }
}

export function getCurrentPPStatus() {
  const ppType = getCurrentPPType();
  return {
    type: ppType,
    name: getPPName(ppType),
    fileName: getPPFileName(ppType),
    currentPP: currentPP,
    isLibur: isHariLibur(),
  };
}

export async function forceChangePP(sock, ppType) {
  if (!["A", "B", "C"].includes(ppType)) {
    throw new Error("Tipe PP tidak valid. Gunakan A, B, atau C");
  }

  const ppFileName = getPPFileName(ppType);
  const ppPath = path.join(rootDir, ppFileName);

  if (!fs.existsSync(ppPath)) {
    throw new Error(`File ${ppFileName} tidak ditemukan`);
  }

  const imageBuffer = fs.readFileSync(ppPath);
  const myJid = sock.user?.id;
  
  if (!myJid) {
    throw new Error("User JID tidak ditemukan");
  }

  await sock.updateProfilePicture(myJid, imageBuffer);
  currentPP = ppType;

  return {
    type: ppType,
    name: getPPName(ppType),
    fileName: ppFileName,
  };
}
