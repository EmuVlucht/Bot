import { config, formatOwnerJid } from "./config.js";
import {
  initGroup,
  initGroupWithData,
  resetGroup,
  getGroupData,
  isGroupInitialized,
  incrementCounter,
  rebaseData,
  saveLiveMessage,
  getLiveMessage,
  stopLiveMessage,
  createLoopMessage,
  stopLoopMessage,
  getLoopMessage,
} from "./storage.js";
import {
  formatCheckpointData,
  parseInitData,
  containsLink,
  isOwner,
  parseLoopCommand,
  formatInterval,
} from "./utils.js";

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
        const isInit = await isGroupInitialized(groupId);
        if (isInit) {
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
      
      if (isGroup && text.startsWith(config.prefix)) {
        await handleCommand(sock, msg, chatId, sender, text);
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
    }

    if (!isGroup) return;

    if (text.startsWith(config.prefix)) {
      await handleCommand(sock, msg, chatId, sender, text);
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
      await createLoopMessage(chatId, cmd.message, cmd.intervalMs);
      const intervalText = formatInterval(cmd.intervalMs);
      await sock.sendMessage(chatId, { 
        text: `Loop pesan aktif!\nInterval: ${intervalText}\nPesan: ${cmd.message}` 
      });
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
  if (content.viewOnce || content.type === "viewOnce") {
    await incrementCounter(groupId, "oneTime");
    return;
  }

  if (containsLink(content.text)) {
    await incrementCounter(groupId, "link");
    return;
  }

  if (content.type === "deleted") {
    await incrementCounter(groupId, "nullMsg");
    return;
  }

  switch (content.type) {
    case "text":
      await incrementCounter(groupId, "text");
      break;
    case "audio":
      if (content.viewOnce) {
        await incrementCounter(groupId, "oneTime");
      } else {
        await incrementCounter(groupId, "audio");
      }
      break;
    case "sticker":
      await incrementCounter(groupId, "sticker");
      break;
    case "doc":
      await incrementCounter(groupId, "doc");
      break;
    case "image":
    case "video":
    case "media":
      await incrementCounter(groupId, "sw");
      break;
    default:
      break;
  }
}

async function handleCommand(sock, msg, groupId, sender, text) {
  const ownerJid = formatOwnerJid(config.ownerNumber);

  if (!isOwner(sender, config.ownerNumber)) {
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
