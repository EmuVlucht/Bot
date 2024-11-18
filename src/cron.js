import cron from "node-cron";
import { config, formatOwnerJid } from "./config.js";
import { getAllGroupsData, getAllActiveLiveMessages, getGroupData, stopLiveMessage, getDueLoopMessages, updateLoopMessageAfterSend, getDueScheduledMessages, updateScheduledMessageAfterSend, markScheduledMessageFailed } from "./storage.js";
import { formatAllGroupsData, formatCheckpointData } from "./utils.js";

export function setupCronJobs(sock) {
  cron.schedule(
    config.cronSchedule,
    async () => {
      console.log("Running daily checkpoint report...");
      await sendDailyReport(sock);
    },
    {
      timezone: config.timezone,
    }
  );

  console.log(`Cron job set for 00:00 ${config.timezone}`);

  setInterval(async () => {
    await updateLiveMessages(sock);
  }, config.liveUpdateInterval);

  console.log("Live update interval set for every 2 minutes");

  setInterval(async () => {
    await sendLoopMessages(sock);
  }, 1000);

  console.log("Loop message checker set for every 1 second");

  setInterval(async () => {
    await sendScheduledMessages(sock);
  }, 1000);

  console.log("Scheduled message checker set for every 1 second");
}

async function sendDailyReport(sock) {
  try {
    const groupsData = await getAllGroupsData();

    if (groupsData.length === 0) {
      console.log("No active groups to report.");
      return;
    }

    const targetJid = formatOwnerJid(config.targetNumber);
    const message = formatAllGroupsData(groupsData);

    await sock.sendMessage(targetJid, { text: message });
    console.log("Daily report sent successfully.");
  } catch (error) {
    console.error("Error sending daily report:", error);
  }
}

async function updateLiveMessages(sock) {
  try {
    const liveMessages = await getAllActiveLiveMessages();
    const now = new Date();

    for (const liveMsg of liveMessages) {
      if (new Date(liveMsg.endTime) <= now) {
        await stopLiveMessage(liveMsg.groupId);
        await sock.sendMessage(liveMsg.groupId, {
          text: "Live checkpoint telah berakhir (15 menit).",
        });
        continue;
      }

      const data = await getGroupData(liveMsg.groupId);
      if (!data) continue;

      try {
        const messageKey = {
          remoteJid: liveMsg.groupId,
          id: liveMsg.messageId,
          fromMe: true,
          participant: sock.user?.id,
        };

        await sock.sendMessage(
          liveMsg.groupId,
          { 
            text: formatCheckpointData(data) + "\n\n[LIVE - Update setiap 2 menit]",
            edit: messageKey
          }
        );
        console.log(`[LIVE] Updated message ${liveMsg.messageId} in ${liveMsg.groupId}`);
      } catch (editError) {
        console.error("Error editing live message:", editError.message);
        await stopLiveMessage(liveMsg.groupId);
      }
    }
  } catch (error) {
    console.error("Error updating live messages:", error);
  }
}

async function sendLoopMessages(sock) {
  try {
    const dueMessages = await getDueLoopMessages();
    
    for (const loopMsg of dueMessages) {
      try {
        await sock.sendMessage(loopMsg.chatId, { text: loopMsg.message });
        const result = await updateLoopMessageAfterSend(loopMsg.id, loopMsg.intervalMs, loopMsg.remainingCount);
        
        if (result.completed) {
          console.log(`[LOOP] Completed for ${loopMsg.chatId} (sent all messages)`);
        } else if (result.unlimited) {
          console.log(`[LOOP] Sent to ${loopMsg.chatId} (unlimited)`);
        } else {
          console.log(`[LOOP] Sent to ${loopMsg.chatId}, remaining: ${result.remaining}`);
        }
      } catch (sendError) {
        console.error(`Error sending loop message to ${loopMsg.chatId}:`, sendError);
      }
    }
  } catch (error) {
    console.error("Error processing loop messages:", error);
  }
}

async function sendScheduledMessages(sock) {
  try {
    const dueMessages = await getDueScheduledMessages();
    
    for (const scheduleMsg of dueMessages) {
      try {
        const targetJid = `${scheduleMsg.targetNumber}@s.whatsapp.net`;
        
        await sock.sendMessage(targetJid, { text: scheduleMsg.message });
        
        const result = await updateScheduledMessageAfterSend(
          scheduleMsg.id, 
          scheduleMsg.sentCount, 
          scheduleMsg.sendCount
        );
        
        if (result.completed) {
          console.log(`[JADWAL] Completed for ${scheduleMsg.targetNumber} (sent ${result.sentCount}/${scheduleMsg.sendCount})`);
          
          await sock.sendMessage(scheduleMsg.creatorChatId, {
            text: `*Jadwal Selesai*\n\nPesan ke ${scheduleMsg.targetNumber} telah selesai dikirim.\nTotal: ${result.sentCount}x`,
          });
        } else {
          console.log(`[JADWAL] Sent to ${scheduleMsg.targetNumber}, ${result.sentCount}/${scheduleMsg.sendCount}`);
        }
        
        if (!result.completed && scheduleMsg.sendCount > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (sendError) {
        console.error(`Error sending scheduled message to ${scheduleMsg.targetNumber}:`, sendError);
        
        await markScheduledMessageFailed(scheduleMsg.id);
        
        try {
          await sock.sendMessage(scheduleMsg.creatorChatId, {
            text: `*Gagal Mengirim Jadwal*\n\nID: ${scheduleMsg.id}\nPesan ke ${scheduleMsg.targetNumber} gagal dikirim.\nError: ${sendError.message}\n\nJadwal telah dibatalkan otomatis.`,
          });
        } catch (notifyError) {
          console.error("Error notifying creator:", notifyError);
        }
      }
    }
  } catch (error) {
    console.error("Error processing scheduled messages:", error);
  }
}
