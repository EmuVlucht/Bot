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
import { processJadwalMessage, getAvailableJadwalTemplates } from "./jadwalTemplates.js";
import { createScheduledMessage, getActiveScheduledMessages, cancelScheduledMessage } from "./storage.js";
import { getCurrentPPStatus, forceChangePP, getLiburList, addLibur, removeLibur, replacePPImage } from "./profilePicture.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import moment from "moment-timezone";
import {
  enableStealthMode,
  disableStealthMode,
  getStealthStatus,
  isStealthModeActive,
  initStealthMode,
} from "./stealthMode.js";

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

  sock.ev.on("group-participants.update", async (update) => {
    try {
      const groupId = update.id;
      const action = update.action;
      const participants = update.participants || [];
      
      const isInit = await isGroupInitialized(groupId);
      if (!isInit) return;
      
      if (action === "add" || action === "remove" || action === "leave") {
        for (const participant of participants) {
          await incrementCounter(groupId, "dll");
          console.log(`[DLL] ${action}: ${participant} in ${groupId}`);
        }
      }
    } catch (error) {
      console.error("[DLL] Error handling group participants update:", error);
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
    console.log("[MSG] Message Keys:", Object.keys(msg.message));
    console.log("[MSG] Full Message:", JSON.stringify(msg.message, null, 2));

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
        await handlePP(sock, msg, chatId, text);
        return;
      }

      if (text.startsWith(".libur")) {
        await handleLibur(sock, chatId, text);
        return;
      }

      if (text.startsWith(".gantipp")) {
        await handleGantiPP(sock, msg, chatId, text);
        return;
      }

      if (text.startsWith(".jadwal")) {
        await handleJadwal(sock, chatId, text);
        return;
      }

      if (text.toLowerCase().startsWith(".stealthmode")) {
        await handleStealthMode(sock, chatId, text);
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
        await handlePP(sock, msg, chatId, text);
        return;
      }

      if (text.startsWith(".libur")) {
        await handleLibur(sock, chatId, text);
        return;
      }

      if (text.startsWith(".gantipp")) {
        await handleGantiPP(sock, msg, chatId, text);
        return;
      }

      if (text.startsWith(".jadwal")) {
        await handleJadwal(sock, chatId, text);
        return;
      }

      if (text.toLowerCase().startsWith(".stealthmode")) {
        await handleStealthMode(sock, chatId, text);
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
          text: `Loop pesan aktif!\nInterval: ${intervalText}\nJumlah: Tak terbatas\nPesan: ${cmd.message}\n\nHentikan dengan: stop ; 0` 
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

  // CHECK VIEW-ONCE WRAPPERS FIRST
  if (message.viewOnceMessage) {
    const innerMsg = message.viewOnceMessage.message;
    if (innerMsg?.imageMessage) {
      return { type: "viewOnce", text: "", viewOnce: true, isImage: true };
    } else if (innerMsg?.audioMessage) {
      return { type: "viewOnce", text: "", viewOnce: true, isAudio: true };
    } else if (innerMsg?.videoMessage) {
      return { type: "viewOnce", text: "", viewOnce: true, isVideo: true };
    }
    return { type: "viewOnce", text: "", viewOnce: true };
  }
  if (message.viewOnceMessageV2) {
    const innerMsg = message.viewOnceMessageV2.message;
    if (innerMsg?.imageMessage) {
      return { type: "viewOnce", text: "", viewOnce: true, isImage: true };
    } else if (innerMsg?.audioMessage) {
      return { type: "viewOnce", text: "", viewOnce: true, isAudio: true };
    } else if (innerMsg?.videoMessage) {
      return { type: "viewOnce", text: "", viewOnce: true, isVideo: true };
    }
    return { type: "viewOnce", text: "", viewOnce: true };
  }

  if (message.conversation) {
    return { type: "text", text: message.conversation };
  }
  if (message.extendedTextMessage) {
    return { type: "text", text: message.extendedTextMessage.text };
  }
  if (message.imageMessage) {
    const hasViewOnce = message.imageMessage.viewOnce;
    return {
      type: "image",
      text: message.imageMessage.caption || "",
      viewOnce: hasViewOnce,
    };
  }
  if (message.videoMessage) {
    if (message.videoMessage.gifPlayback) {
      return { type: "gif", text: "" };
    }
    const hasViewOnce = message.videoMessage.viewOnce;
    return {
      type: "video",
      text: message.videoMessage.caption || "",
      viewOnce: hasViewOnce,
    };
  }
  if (message.audioMessage) {
    const hasViewOnce = message.audioMessage.viewOnce;
    return {
      type: "audio",
      text: "",
      viewOnce: hasViewOnce,
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
  if (message.protocolMessage) {
    if (message.protocolMessage.type === 0) {
      return { type: "deleted", text: "" };
    }
  }
  if (message.groupStatusMentionMessage) {
    return { type: "statusMention", text: "" };
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
      case "image":
      case "video":
      case "media":
        if (content.viewOnce) {
          messageType = "oneTime";
        } else {
          messageType = "media";
        }
        break;
      case "sticker":
      case "gif":
        messageType = "sticker";
        break;
      case "doc":
        messageType = "doc";
        break;
      case "statusMention":
        messageType = "sw";
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

async function handlePP(sock, msg, chatId, text) {
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

async function handleLibur(sock, chatId, text) {
  try {
    const args = text.replace(".libur", "").trim();
    const parts = args.split(/\s+/);
    const action = parts[0]?.toLowerCase();

    if (!action || action === "list") {
      const liburList = getLiburList();
      const entries = Object.entries(liburList).sort((a, b) => a[0].localeCompare(b[0]));

      if (entries.length === 0) {
        await sock.sendMessage(chatId, { text: "Tidak ada hari libur yang terdaftar." });
        return;
      }

      let listText = "📅 *Daftar Hari Libur Nasional*\n\n";
      for (const [tanggal, keterangan] of entries) {
        listText += `• ${tanggal}: ${keterangan}\n`;
      }

      listText += "\n*Perintah:*\n";
      listText += ".libur list - Lihat daftar\n";
      listText += ".libur tambah YYYY-MM-DD Keterangan\n";
      listText += ".libur hapus YYYY-MM-DD";

      await sock.sendMessage(chatId, { text: listText });
      return;
    }

    if (action === "tambah" || action === "add") {
      const tanggal = parts[1];
      const keterangan = parts.slice(2).join(" ");

      if (!tanggal || !keterangan) {
        await sock.sendMessage(chatId, {
          text: "Format: .libur tambah YYYY-MM-DD Keterangan\n\nContoh:\n.libur tambah 2025-12-31 Malam Tahun Baru",
        });
        return;
      }

      const result = addLibur(tanggal, keterangan);
      await sock.sendMessage(chatId, {
        text: `✅ Hari libur berhasil ditambahkan!\n\nTanggal: ${result.tanggal}\nKeterangan: ${result.keterangan}`,
      });
      return;
    }

    if (action === "hapus" || action === "delete" || action === "remove") {
      const tanggal = parts[1];

      if (!tanggal) {
        await sock.sendMessage(chatId, {
          text: "Format: .libur hapus YYYY-MM-DD\n\nContoh:\n.libur hapus 2025-12-31",
        });
        return;
      }

      const result = removeLibur(tanggal);
      await sock.sendMessage(chatId, {
        text: `✅ Hari libur berhasil dihapus!\n\nTanggal: ${result.tanggal}\nKeterangan: ${result.keterangan}`,
      });
      return;
    }

    await sock.sendMessage(chatId, {
      text: "Perintah tidak dikenal.\n\nGunakan:\n.libur list - Lihat daftar\n.libur tambah YYYY-MM-DD Keterangan\n.libur hapus YYYY-MM-DD",
    });

  } catch (error) {
    console.error("Error handling libur command:", error);
    await sock.sendMessage(chatId, { text: `Gagal: ${error.message}` });
  }
}

async function handleGantiPP(sock, msg, chatId, text) {
  try {
    const args = text.replace(".gantipp", "").trim().toLowerCase();

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
          text: "Cara pakai: Kirim gambar dengan caption\n\n.gantipp malam - Ganti gambar PP Malam\n.gantipp siang - Ganti gambar PP Siang\n.gantipp khusus - Ganti gambar PP Khusus",
        });
        return;
    }

    const message = msg.message;
    const hasImage = message?.imageMessage || message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!hasImage) {
      await sock.sendMessage(chatId, {
        text: "Kirim gambar baru dengan caption .gantipp malam/siang/khusus\n\nAtau reply gambar dengan caption yang sama.",
      });
      return;
    }

    await sock.sendMessage(chatId, { text: "Mengunduh gambar..." });

    let imageMessage;
    if (message?.imageMessage) {
      imageMessage = msg;
    } else {
      const quotedMsg = message?.extendedTextMessage?.contextInfo?.quotedMessage;
      imageMessage = {
        message: quotedMsg,
      };
    }

    const buffer = await downloadMediaMessage(imageMessage, "buffer", {});

    await sock.sendMessage(chatId, { text: "Menyimpan gambar..." });

    const result = await replacePPImage(ppType, buffer);

    await sock.sendMessage(chatId, {
      text: `✅ Gambar PP berhasil diganti!\n\nTipe: ${result.name}\nFile: ${result.fileName}\n\nGunakan .pp ${args} untuk menerapkan sekarang.`,
    });

  } catch (error) {
    console.error("Error handling gantipp command:", error);
    await sock.sendMessage(chatId, { text: `Gagal mengganti gambar PP: ${error.message}` });
  }
}

const TIMEZONE_MAP = {
  "UTC": "UTC",
  "WIB": "Asia/Jakarta",
  "WIT": "Asia/Jayapura",
  "WITA": "Asia/Makassar",
};

async function handleJadwal(sock, chatId, text) {
  try {
    const args = text.replace(".jadwal", "").trim();

    if (!args || args === "help") {
      const templates = getAvailableJadwalTemplates();
      await sock.sendMessage(chatId, {
        text: `*Format Perintah .jadwal*

.jadwal <nomor> ; <jumlah> ; <waktu> ; <pesan>
.jadwal <nomor> ; <waktu> ; <pesan>

*Contoh:*
.jadwal 6256566777 ; 2 ; 11:03:56 28-11-2025 (WIT) ; hai
.jadwal 6256677 ; 11:03:56 28-11-2025 (UTC) ; hello
.jadwal 6257777 ; 5 ; 11:03:56 28-11-2025 (WIB) ; $ salam

*Format Waktu:*
HH:MM:SS DD-MM-YYYY (ZONA)

*Zona Waktu:*
- UTC
- WIB (Jakarta)
- WIT (Papua)
- WITA (Makassar)

*Template (gunakan $ didepan):*
${templates.map(t => `- $ ${t}`).join("\n")}

*Perintah Lainnya:*
.jadwal list - Lihat jadwal aktif
.jadwal batal <id> - Batalkan jadwal`,
      });
      return;
    }

    if (args === "list") {
      const activeSchedules = await getActiveScheduledMessages(chatId);
      if (activeSchedules.length === 0) {
        await sock.sendMessage(chatId, { text: "Tidak ada jadwal pesan aktif." });
        return;
      }

      let listText = "*Jadwal Pesan Aktif:*\n\n";
      for (const schedule of activeSchedules) {
        const scheduledMoment = moment(schedule.scheduledTime).tz(TIMEZONE_MAP[schedule.timezone] || "UTC");
        listText += `ID: ${schedule.id}\n`;
        listText += `Ke: ${schedule.targetNumber}\n`;
        listText += `Waktu: ${scheduledMoment.format("HH:mm:ss DD-MM-YYYY")} (${schedule.timezone})\n`;
        listText += `Pesan: ${schedule.message}\n`;
        listText += `Jumlah: ${schedule.sentCount}/${schedule.sendCount}\n\n`;
      }
      listText += "Batalkan dengan: .jadwal batal <id>";

      await sock.sendMessage(chatId, { text: listText });
      return;
    }

    if (args.startsWith("batal ") || args.startsWith("cancel ")) {
      const idStr = args.replace(/^(batal|cancel)\s+/, "").trim();
      const id = parseInt(idStr);

      if (isNaN(id)) {
        await sock.sendMessage(chatId, { text: "ID tidak valid. Gunakan angka." });
        return;
      }

      await cancelScheduledMessage(id);
      await sock.sendMessage(chatId, { text: `Jadwal dengan ID ${id} telah dibatalkan.` });
      return;
    }

    const parts = args.split(";").map(p => p.trim());

    if (parts.length < 3) {
      await sock.sendMessage(chatId, { 
        text: "Format tidak valid. Gunakan:\n.jadwal <nomor> ; <jumlah> ; <waktu> ; <pesan>\nAtau:\n.jadwal <nomor> ; <waktu> ; <pesan>\n\nKetik .jadwal help untuk bantuan." 
      });
      return;
    }

    let nomorTujuan, jumlah, waktuStr, pesan;

    if (parts.length === 3) {
      nomorTujuan = parts[0];
      jumlah = 1;
      waktuStr = parts[1];
      pesan = parts[2];
    } else {
      nomorTujuan = parts[0];
      jumlah = parseInt(parts[1]);
      waktuStr = parts[2];
      pesan = parts.slice(3).join(";").trim();
    }

    if (!/^\d+$/.test(nomorTujuan)) {
      await sock.sendMessage(chatId, { text: "Nomor tujuan tidak valid. Gunakan format angka: 62xxx" });
      return;
    }

    if (isNaN(jumlah) || jumlah < 1) {
      await sock.sendMessage(chatId, { text: "Jumlah harus berupa angka minimal 1." });
      return;
    }

    if (jumlah > 100) {
      await sock.sendMessage(chatId, { text: "Maksimal 100 pesan per jadwal." });
      return;
    }

    const timeMatch = waktuStr.match(/^(\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})-(\d{1,2})-(\d{4})\s*\((\w+)\)$/);

    if (!timeMatch) {
      await sock.sendMessage(chatId, { 
        text: "Format waktu tidak valid.\n\nGunakan: HH:MM:SS DD-MM-YYYY (ZONA)\nContoh: 11:03:56 28-11-2025 (WIT)" 
      });
      return;
    }

    const [, jam, menit, detik, tanggal, bulan, tahun, timezone] = timeMatch;
    const tzUpper = timezone.toUpperCase();

    if (!TIMEZONE_MAP[tzUpper]) {
      await sock.sendMessage(chatId, { 
        text: `Zona waktu "${timezone}" tidak dikenal.\n\nGunakan: UTC, WIB, WIT, atau WITA` 
      });
      return;
    }

    const dateStr = `${tahun}-${bulan.padStart(2, "0")}-${tanggal.padStart(2, "0")} ${jam.padStart(2, "0")}:${menit}:${detik}`;
    const scheduledMoment = moment.tz(dateStr, "YYYY-MM-DD HH:mm:ss", TIMEZONE_MAP[tzUpper]);

    if (!scheduledMoment.isValid()) {
      await sock.sendMessage(chatId, { text: "Tanggal/waktu tidak valid." });
      return;
    }

    const now = moment();
    if (scheduledMoment.isBefore(now)) {
      await sock.sendMessage(chatId, { text: "Waktu jadwal sudah lewat. Gunakan waktu di masa depan." });
      return;
    }

    const processedMessage = processJadwalMessage(pesan);

    const scheduledTime = scheduledMoment.toDate();

    const result = await createScheduledMessage(
      nomorTujuan,
      processedMessage,
      jumlah,
      scheduledTime,
      tzUpper,
      chatId
    );

    const confirmMoment = moment(scheduledTime).tz(TIMEZONE_MAP[tzUpper]);

    await sock.sendMessage(chatId, {
      text: `*Jadwal Pesan Dibuat*

ID: ${result.id}
Ke: ${nomorTujuan}
Waktu: ${confirmMoment.format("HH:mm:ss DD-MM-YYYY")} (${tzUpper})
Jumlah: ${jumlah}x
Pesan: ${processedMessage}

Pesan akan dikirim pada waktu yang ditentukan.
Batalkan dengan: .jadwal batal ${result.id}`,
    });

  } catch (error) {
    console.error("Error handling jadwal command:", error);
    await sock.sendMessage(chatId, { text: `Gagal membuat jadwal: ${error.message}` });
  }
}

async function handleStealthMode(sock, chatId, text) {
  try {
    const args = text.toLowerCase().replace(".stealthmode", "").trim();

    if (!args || args === "status") {
      const status = getStealthStatus();
      const statusEmoji = status.enabled ? "ON" : "OFF";

      await sock.sendMessage(chatId, {
        text: `*Stealth Mode Status: ${statusEmoji}*\n\n` +
          `Ghost Read: ${status.features.ghostRead ? "ON" : "OFF"}\n` +
          `Ghost Online: ${status.features.ghostOnline ? "ON" : "OFF"}\n` +
          `Ghost Typing: ${status.features.ghostTyping ? "ON" : "OFF"}\n` +
          `Ghost Status View: ${status.features.ghostStatusView ? "ON" : "OFF"}\n\n` +
          `*Perintah:*\n` +
          `.stealthMode on - Aktifkan stealth mode\n` +
          `.stealthMode off - Matikan stealth mode\n` +
          `.stealthMode status - Lihat status\n\n` +
          `*Fungsi Stealth Mode:*\n` +
          `- Ghost Read: Tidak mengirim centang biru\n` +
          `- Ghost Online: Tidak terlihat online\n` +
          `- Ghost Typing: Tidak kirim indikator typing\n` +
          `- Ghost Status View: Lihat status tanpa ketahuan`
      });
      return;
    }

    if (args === "on") {
      const result = await enableStealthMode(sock);
      await sock.sendMessage(chatId, { text: result.message });
      return;
    }

    if (args === "off") {
      const result = await disableStealthMode(sock);
      await sock.sendMessage(chatId, { text: result.message });
      return;
    }

    await sock.sendMessage(chatId, {
      text: "Perintah tidak dikenal.\n\nGunakan:\n.stealthMode on - Aktifkan stealth mode\n.stealthMode off - Matikan stealth mode\n.stealthMode status - Lihat status"
    });

  } catch (error) {
    console.error("Error handling stealthMode command:", error);
    await sock.sendMessage(chatId, { text: `Gagal: ${error.message}` });
  }
}