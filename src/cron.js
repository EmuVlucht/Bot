import cron from "node-cron";
import { config, formatOwnerJid } from "./config.js";
import { getAllGroupsData, getAllActiveLiveMessages, getGroupData, stopLiveMessage } from "./storage.js";
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
        };

        await sock.sendMessage(
          liveMsg.groupId,
          { text: formatCheckpointData(data) + "\n\n[LIVE - Update setiap 2 menit]" },
          { edit: messageKey }
        );
      } catch (editError) {
        console.error("Error editing live message:", editError);
        await stopLiveMessage(liveMsg.groupId);
      }
    }
  } catch (error) {
    console.error("Error updating live messages:", error);
  }
}
