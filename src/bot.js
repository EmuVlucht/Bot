import { config, formatOwnerJid } from "./config.js";
import {
  initGroup,
  initGroupWithData,
  resetGroup,
  getGroupData,
  isGroupInitialized,
  incrementCounter,
  decrementCounter,
  rebaseData,
  saveLiveMessage,
  getLiveMessage,
  stopLiveMessage,
  createLoopMessage,
  stopLoopMessage,
  getLoopMessage,
  trackMessage,
  getTrackedMessage,
  deleteTrackedMessage,
} from "./storage.js";
import {
  formatCheckpointData,
  parseInitData,
  containsLink,
  isOwner,
  parseLoopCommand,
  formatInterval,
} from "./utils.js";
import { findAutoReply } from "./autoReply.js";
import { getTemplate, getAvailableTemplates } from "./kirimTemplates.js";
import { getCurrentPPStatus, forceChangePP } from "./profilePicture.js";

export function setupMessageHandler(sock) {
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.update?.messageStubType === 1) {
        const groupId = update.key.remoteJid;
        const messageId = update.key.id;
        const isInit = await isGroupInitialized(groupId);
        if (isInit) {
          const tracked = await getTrackedMessage(groupId, messageId);
          if (tracked) {
            await decrementCounter(groupId, tracked.messageType);
            await deleteTrackedMessage(groupId, messageId);
            console.log(`[DELETE] Decremented ${tracked.messageType} for deleted message ${messageId}`);
          }
          await incrementCounter(groupId, "nullMsg");
        }
      }
    }
  });
}

async function handleMessage(sock, msg) {
  try {
    if (!msg.message) return;

    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const fromMe = msg.key.fromMe;

    const messageContent = getMessageContent(msg);
    const text = messageContent.text || "";

    console.log(`[MSG] From: ${sender}, FromMe: ${fromMe}, Text: "${text}"`);

    if (fromMe) {
      const loopCmd = parseLoopCommand(text);
      console.log(`[MSG] Loop command parsed:`, loopCmd);
      if (loopCmd) {
        await handleLoopCommand(sock, chatId, loopCmd);
        return;
      }
      
      if (text.startsWith(".kirim")) {
        await handleKirim(sock, chatId, text);
        return;
      }
      
      if (text.startsWith(".pp")) {
        await handlePP(sock, chatId, text);
        return;
      }
      
      if (isGroup && text.startsWith(config.prefix)) {
        await handleCommand(sock, msg, chatId, sender, text, true);
      }
      return;
    }

    const ownerCheck = isOwner(sender, config.ownerNumber);
    if (ownerCheck) {
      const loopCmd = parseLoopCommand(text);
      if (loopCmd) {
        await handleLoopCommand(sock, chatId, loopCmd);
        return;
      }
      
      if (text.startsWith(".kirim")) {
        await handleKirim(sock, chatId, text);
        return;
      }
      
      if (text.startsWith(".pp")) {
        await handlePP(sock, chatId, text);
        return;
      }
    }

    const autoReplyText = findAutoReply(text);
    if (autoReplyText) {
      await sock.sendMessage(chatId, { text: autoReplyText });
      console.log(`[AUTO-REPLY] "${text}" -> "${autoReplyText}"`);
    }

    if (!isGroup) return;

    if (text.startsWith(config.prefix)) {
      await handleCommand(sock, msg, chatId, sender, text, ownerCheck);
    } else {
      const isInit = await isGroupInitialized(chatId);
      if (isInit) {
        await countMessage(chatId, msg, messageContent);
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

async function handleLoopCommand(sock, chatId, cmd) {
  try {
    if (cmd.type === "stop") {
      const existing = await getLoopMessage(chatId);
      if (existing) {
        await stopLoopMessage(chatId);
        await sock.sendMessage(chatId, { text: "Loop pesan dihentikan." });
      } else {
        await sock.sendMessage(chatId, { text: "Tidak ada loop pesan aktif di sini." });
      }
    } else if (cmd.type === "start") {
      await createLoopMessage(chatId, cmd.message, cmd.intervalMs, cmd.count);
      const intervalText = formatInterval(cmd.intervalMs);
      
      if (cmd.unlimited) {
        await sock.sendMessage(chatId, { 
          text: `Loop pesan aktif!\nInterval: ${intervalText}\nJumlah: Tak terbatas\nPesan: ${cmd.message}\n\nHentikan dengan: ∅ : 0` 
        });
      } else {
        await sock.sendMessage(chatId, { 
          text: `Loop pesan aktif!\nInterval: ${intervalText}\nJumlah: ${cmd.count}x\nPesan: ${cmd.message}` 
        });
      }
    }
  } catch (error) {
    console.error("Error handling loop command:", error);
    await sock.sendMessage(chatId, { text: "Gagal memproses perintah loop." });
  }
}

function getMessageContent(msg) {
  const message = msg.message;

  if (message.conversation) {
    return { type: "text", text: message.conversation };
  }
  if (message.extendedTextMessage) {
    return { type: "text", text: message.extendedTextMessage.text };
  }
  if (message.imageMessage) {
    return {
      type: "image",
      text: message.imageMessage.caption || "",
      viewOnce: message.imageMessage.viewOnce,
    };
  }
  if (message.videoMessage) {
    return {
      type: "video",
      text: message.videoMessage.caption || "",
      viewOnce: message.videoMessage.viewOnce,
    };
  }
  if (message.audioMessage) {
    return {
      type: "audio",
      text: "",
      viewOnce: message.audioMessage.viewOnce,
      ptt: message.audioMessage.ptt,
    };
  }
  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || "";
    const isMedia = /mp4|mp3|jpg|jpeg|png/i.test(mimetype);
    return { type: isMedia ? "media" : "doc", text: message.documentMessage.caption || "" };
  }
  if (message.stickerMessage) {
    return { type: "sticker", text: "" };
  }
  if (message.viewOnceMessage || message.viewOnceMessageV2) {
    return { type: "viewOnce", text: "" };
  }
  if (message.protocolMessage) {
    if (message.protocolMessage.type === 0) {
      return { type: "deleted", text: "" };
    }
  }

  return { type: "unknown", text: "" };
}

async function countMessage(groupId, msg, content) {
  if (content.type === "deleted") {
    return;
  }

  const messageId = msg.key.id;
  let messageType = null;

  if (content.viewOnce || content.type === "viewOnce") {
    messageType = "oneTime";
  } else if (containsLink(content.text)) {
    messageType = "link";
  } else {
    switch (content.type) {
      case "text":
        messageType = "text";
        break;
      case "audio":
        if (content.viewOnce) {
          messageType = "oneTime";
        } else {
          messageType = "audio";
        }
        break;
      case "sticker":
        messageType = "sticker";
        break;
      case "doc":
        messageType = "doc";
        break;
      case "image":
      case "video":
      case "media":
        messageType = "media";
        break;
      default:
        break;
    }
  }

  if (messageType) {
    await incrementCounter(groupId, messageType);
    await trackMessage(groupId, messageId, messageType);
    console.log(`[COUNT] Tracked message ${messageId} as ${messageType}`);
  }
}

async function handleCommand(sock, msg, groupId, sender, text, isAuthorized = false) {
  if (!isAuthorized && !isOwner(sender, config.ownerNumber)) {
    return;
  }

  const command = text.replace(config.prefix, "").trim().split("\n")[0].trim();
  const dataText = text.replace(config.prefix, "").trim().split("\n").slice(1).join("\n");

  let groupName = "Unknown";
  try {
    const metadata = await sock.groupMetadata(groupId);
    groupName = metadata.subject;
  } catch (e) {
    console.error("Failed to get group metadata:", e);
  }

  switch (command.toLowerCase()) {
    case "init":
      await handleInit(sock, msg, groupId, groupName, dataText);
      break;
    case "":
      await handleCheckpoint(sock, msg, groupId);
      break;
    case "reset":
      await handleReset(sock, msg, groupId);
      break;
    case "live":
      await handleLive(sock, msg, groupId);
      break;
    case "unlive":
      await handleUnlive(sock, msg, groupId);
      break;
    case "rebase":
      await handleRebase(sock, msg, groupId, dataText);
      break;
    default:
      await sock.sendMessage(groupId, {
        text: `Perintah tidak dikenal: ${command}`,
      });
  }
}

async function handleInit(sock, msg, groupId, groupName, dataText) {
  try {
    if (dataText.trim()) {
      const data = parseInitData(dataText);
      await initGroupWithData(groupId, groupName, data);
      const currentData = await getGroupData(groupId);
      await sock.sendMessage(groupId, {
        text: `Checkpoint diinisialisasi dengan data:\n\n${formatCheckpointData(currentData)}`,
      });
    } else {
      await initGroup(groupId, groupName);
      await sock.sendMessage(groupId, {
        text: `Checkpoint diinisialisasi untuk grup "${groupName}".\nSemua perhitungan dimulai dari 0.`,
      });
    }
  } catch (error) {
    console.error("Error initializing group:", error);
    await sock.sendMessage(groupId, { text: "Gagal menginisialisasi checkpoint." });
  }
}

async function handleCheckpoint(sock, msg, groupId) {
  try {
    const isInit = await isGroupInitialized(groupId);
    if (!isInit) {
      await sock.sendMessage(groupId, {
        text: "Grup ini belum diinisialisasi. Gunakan .checkpoint init terlebih dahulu.",
      });
      return;
    }

    const data = await getGroupData(groupId);
    if (!data) {
      await sock.sendMessage(groupId, { text: "Data tidak ditemukan." });
      return;
    }

    await sock.sendMessage(groupId, { text: formatCheckpointData(data) });
  } catch (error) {
    console.error("Error getting checkpoint:", error);
    await sock.sendMessage(groupId, { text: "Gagal mengambil data checkpoint." });
  }
}

async function handleReset(sock, msg, groupId) {
  try {
    await resetGroup(groupId);
    await sock.sendMessage(groupId, {
      text: "Data checkpoint telah direset. Gunakan .checkpoint init untuk memulai ulang.",
    });
  } catch (error) {
    console.error("Error resetting group:", error);
    await sock.sendMessage(groupId, { text: "Gagal mereset data checkpoint." });
  }
}

async function handleLive(sock, msg, groupId) {
  try {
    const isInit = await isGroupInitialized(groupId);
    if (!isInit) {
      await sock.sendMessage(groupId, {
        text: "Grup ini belum diinisialisasi. Gunakan .checkpoint init terlebih dahulu.",
      });
      return;
    }

    const data = await getGroupData(groupId);
    if (!data) {
      await sock.sendMessage(groupId, { text: "Data tidak ditemukan." });
      return;
    }

    const sentMsg = await sock.sendMessage(groupId, {
      text: formatCheckpointData(data) + "\n\n[LIVE - Update setiap 2 menit]",
    });

    await saveLiveMessage(groupId, sentMsg.key.id);

    await sock.sendMessage(groupId, {
      text: "Live checkpoint aktif selama 15 menit. Update setiap 2 menit.",
    });
  } catch (error) {
    console.error("Error starting live:", error);
    await sock.sendMessage(groupId, { text: "Gagal memulai live checkpoint." });
  }
}

async function handleUnlive(sock, msg, groupId) {
  try {
    await stopLiveMessage(groupId);
    await sock.sendMessage(groupId, { text: "Live checkpoint dihentikan." });
  } catch (error) {
    console.error("Error stopping live:", error);
    await sock.sendMessage(groupId, { text: "Gagal menghentikan live checkpoint." });
  }
}

async function handleRebase(sock, msg, groupId, dataText) {
  try {
    const isInit = await isGroupInitialized(groupId);
    if (!isInit) {
      await sock.sendMessage(groupId, {
        text: "Grup ini belum diinisialisasi. Gunakan .checkpoint init terlebih dahulu.",
      });
      return;
    }

    if (!dataText.trim()) {
      await sock.sendMessage(groupId, {
        text: "Format: .checkpoint rebase\n<jumlah> <tipe>\n\nContoh:\n.checkpoint rebase\n100 Sw\n50 Doc",
      });
      return;
    }

    const data = parseInitData(dataText);
    await rebaseData(groupId, data);

    const currentData = await getGroupData(groupId);
    await sock.sendMessage(groupId, {
      text: `Data ditambahkan. Hasil sekarang:\n\n${formatCheckpointData(currentData)}`,
    });
  } catch (error) {
    console.error("Error rebasing data:", error);
    await sock.sendMessage(groupId, { text: "Gagal menambahkan data." });
  }
}

async function handleKirim(sock, chatId, text) {
  try {
    const parts = text.replace(".kirim", "").trim().split(/\s+/);
    
    if (parts.length < 3 || (parts.length === 1 && parts[0] === "")) {
      const templates = getAvailableTemplates();
      await sock.sendMessage(chatId, {
        text: `Format: .kirim <jenis> <jumlah> <nomor>\n\nContoh:\n.kirim salam 10 62797889\n\nTemplate tersedia:\n${templates.map(t => `- ${t}`).join("\n")}\n\nAtau gunakan pesan kustom:\n.kirim "Pesanmu di sini" 5 62797889`,
      });
      return;
    }
    
    let jenis, jumlah, nomorTujuan, pesanKirim;
    
    const customMatch = text.match(/\.kirim\s+"([^"]+)"\s+(\d+)\s+(\d+)/);
    if (customMatch) {
      pesanKirim = customMatch[1];
      jumlah = parseInt(customMatch[2]);
      nomorTujuan = customMatch[3];
    } else {
      jenis = parts[0];
      jumlah = parseInt(parts[1]);
      nomorTujuan = parts[2];
      
      pesanKirim = getTemplate(jenis);
      if (!pesanKirim) {
        const templates = getAvailableTemplates();
        await sock.sendMessage(chatId, {
          text: `Jenis "${jenis}" tidak ditemukan.\n\nTemplate tersedia:\n${templates.map(t => `- ${t}`).join("\n")}\n\nAtau gunakan pesan kustom:\n.kirim "Pesanmu di sini" 5 62797889`,
        });
        return;
      }
    }
    
    if (isNaN(jumlah) || jumlah < 1) {
      await sock.sendMessage(chatId, { text: "Jumlah harus berupa angka minimal 1." });
      return;
    }
    
    if (jumlah > 100) {
      await sock.sendMessage(chatId, { text: "Maksimal 100 pesan per perintah." });
      return;
    }
    
    if (!nomorTujuan || !/^\d+$/.test(nomorTujuan)) {
      await sock.sendMessage(chatId, { text: "Nomor tujuan tidak valid. Gunakan format: 62xxx" });
      return;
    }
    
    const targetJid = `${nomorTujuan}@s.whatsapp.net`;
    
    await sock.sendMessage(chatId, {
      text: `Mengirim "${pesanKirim}" sebanyak ${jumlah}x ke ${nomorTujuan}...`,
    });
    
    let sukses = 0;
    let gagal = 0;
    
    for (let i = 0; i < jumlah; i++) {
      try {
        await sock.sendMessage(targetJid, { text: pesanKirim });
        sukses++;
        
        if (jumlah > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Error sending message ${i + 1}:`, err);
        gagal++;
      }
    }
    
    await sock.sendMessage(chatId, {
      text: `Selesai!\nBerhasil: ${sukses}\nGagal: ${gagal}`,
    });
    
  } catch (error) {
    console.error("Error handling kirim:", error);
    await sock.sendMessage(chatId, { text: "Gagal mengirim pesan." });
  }
}

async function handlePP(sock, chatId, text) {
  try {
    const args = text.replace(".pp", "").trim().toLowerCase();
    
    if (!args || args === "status") {
      const status = getCurrentPPStatus();
      const statusText = `📷 *Status Profile Picture*\n\nPP Saat Ini: ${status.currentPP ? status.name : "Belum diset"}\nPP Seharusnya: ${status.name}\nFile: ${status.fileName}\nHari Libur: ${status.isLibur ? "Ya" : "Tidak"}\n\n*Jadwal Otomatis:*\n- PP Malam (A): 17:00 - 05:00 WIT\n- PP Siang (B): 05:00 - 12:00 & 13:00 - 17:00 WIT\n- PP Khusus (C): Jam 12, Weekend, Libur Nasional\n\n*Perintah:*\n.pp status - Lihat status\n.pp malam - Ganti ke PP Malam\n.pp siang - Ganti ke PP Siang\n.pp khusus - Ganti ke PP Khusus`;
      
      await sock.sendMessage(chatId, { text: statusText });
      return;
    }
    
    let ppType;
    switch (args) {
      case "malam":
      case "a":
        ppType = "A";
        break;
      case "siang":
      case "b":
        ppType = "B";
        break;
      case "khusus":
      case "c":
        ppType = "C";
        break;
      default:
        await sock.sendMessage(chatId, {
          text: "Tipe PP tidak valid.\n\nGunakan:\n.pp malam - PP Malam\n.pp siang - PP Siang\n.pp khusus - PP Khusus\n.pp status - Lihat status",
        });
        return;
    }
    
    await sock.sendMessage(chatId, { text: `Mengubah PP ke ${args}...` });
    
    const result = await forceChangePP(sock, ppType);
    
    await sock.sendMessage(chatId, {
      text: `✅ PP berhasil diganti!\n\nTipe: ${result.name}\nFile: ${result.fileName}`,
    });
    
  } catch (error) {
    console.error("Error handling PP command:", error);
    await sock.sendMessage(chatId, { text: `Gagal mengganti PP: ${error.message}` });
  }
}
