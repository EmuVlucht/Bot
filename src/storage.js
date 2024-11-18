import { db } from "./db.js";
import { groups, checkpointData, liveMessages, loopMessages, messageTracking, scheduledMessages } from "../shared/schema.js";
import { eq, and, lte } from "drizzle-orm";

export async function initGroup(groupId, groupName) {
  const existingGroup = await db
    .select()
    .from(groups)
    .where(eq(groups.groupId, groupId));

  if (existingGroup.length > 0) {
    await db
      .update(groups)
      .set({ isActive: true, groupName, updatedAt: new Date() })
      .where(eq(groups.groupId, groupId));
  } else {
    await db.insert(groups).values({ groupId, groupName, isActive: true });
  }

  const existingData = await db
    .select()
    .from(checkpointData)
    .where(eq(checkpointData.groupId, groupId));

  if (existingData.length === 0) {
    await db.insert(checkpointData).values({
      groupId,
      sw: 0,
      doc: 0,
      text: 0,
      audio: 0,
      sticker: 0,
      oneTime: 0,
      link: 0,
      media: 0,
      nullMsg: 0,
    });
  }

  return true;
}

export async function initGroupWithData(groupId, groupName, data) {
  await initGroup(groupId, groupName);

  await db
    .update(checkpointData)
    .set({
      sw: data.sw || 0,
      doc: data.doc || 0,
      text: data.text || 0,
      audio: data.audio || 0,
      sticker: data.sticker || 0,
      oneTime: data.oneTime || 0,
      link: data.link || 0,
      nullMsg: data.nullMsg || 0,
      updatedAt: new Date(),
    })
    .where(eq(checkpointData.groupId, groupId));

  return true;
}

export async function resetGroup(groupId) {
  await db.delete(checkpointData).where(eq(checkpointData.groupId, groupId));
  await db.delete(groups).where(eq(groups.groupId, groupId));
  await db.delete(liveMessages).where(eq(liveMessages.groupId, groupId));
  return true;
}

export async function getGroupData(groupId) {
  const data = await db
    .select()
    .from(checkpointData)
    .where(eq(checkpointData.groupId, groupId));

  return data.length > 0 ? data[0] : null;
}

export async function isGroupInitialized(groupId) {
  const group = await db
    .select()
    .from(groups)
    .where(and(eq(groups.groupId, groupId), eq(groups.isActive, true)));

  return group.length > 0;
}

export async function getAllActiveGroups() {
  const activeGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.isActive, true));

  return activeGroups;
}

export async function getAllGroupsData() {
  const activeGroups = await getAllActiveGroups();
  const result = [];

  for (const group of activeGroups) {
    const data = await getGroupData(group.groupId);
    if (data) {
      result.push({
        groupId: group.groupId,
        groupName: group.groupName,
        data,
      });
    }
  }

  return result;
}

export async function incrementCounter(groupId, type) {
  const data = await getGroupData(groupId);
  if (!data) return false;

  const updateObj = { updatedAt: new Date() };

  switch (type) {
    case "sw":
      updateObj.sw = data.sw + 1;
      break;
    case "doc":
      updateObj.doc = data.doc + 1;
      break;
    case "text":
      updateObj.text = data.text + 1;
      break;
    case "audio":
      updateObj.audio = data.audio + 1;
      break;
    case "sticker":
      updateObj.sticker = data.sticker + 1;
      break;
    case "oneTime":
      updateObj.oneTime = data.oneTime + 1;
      break;
    case "link":
      updateObj.link = data.link + 1;
      break;
    case "media":
      updateObj.media = data.media + 1;
      break;
    case "nullMsg":
      updateObj.nullMsg = data.nullMsg + 1;
      break;
    case "dll":
      updateObj.dll = data.dll + 1;
      break;
    default:
      return false;
  }

  await db
    .update(checkpointData)
    .set(updateObj)
    .where(eq(checkpointData.groupId, groupId));

  return true;
}

export async function rebaseData(groupId, data) {
  const currentData = await getGroupData(groupId);
  if (!currentData) return false;

  await db
    .update(checkpointData)
    .set({
      sw: currentData.sw + (data.sw || 0),
      doc: currentData.doc + (data.doc || 0),
      text: currentData.text + (data.text || 0),
      audio: currentData.audio + (data.audio || 0),
      sticker: currentData.sticker + (data.sticker || 0),
      oneTime: currentData.oneTime + (data.oneTime || 0),
      link: currentData.link + (data.link || 0),
      media: currentData.media + (data.media || 0),
      nullMsg: currentData.nullMsg + (data.nullMsg || 0),
      dll: currentData.dll + (data.dll || 0),
      updatedAt: new Date(),
    })
    .where(eq(checkpointData.groupId, groupId));

  return true;
}

export async function saveLiveMessage(groupId, messageId) {
  await db.delete(liveMessages).where(eq(liveMessages.groupId, groupId));

  const endTime = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(liveMessages).values({
    groupId,
    messageId,
    startTime: new Date(),
    endTime,
    isActive: true,
  });

  return true;
}

export async function getLiveMessage(groupId) {
  const msg = await db
    .select()
    .from(liveMessages)
    .where(and(eq(liveMessages.groupId, groupId), eq(liveMessages.isActive, true)));

  return msg.length > 0 ? msg[0] : null;
}

export async function stopLiveMessage(groupId) {
  await db
    .update(liveMessages)
    .set({ isActive: false })
    .where(eq(liveMessages.groupId, groupId));

  return true;
}

export async function getAllActiveLiveMessages() {
  const msgs = await db
    .select()
    .from(liveMessages)
    .where(eq(liveMessages.isActive, true));

  return msgs;
}

export async function createLoopMessage(chatId, message, intervalMs, count = 1) {
  await db.delete(loopMessages).where(eq(loopMessages.chatId, chatId));
  
  const now = new Date();
  const nextSend = new Date(now.getTime() + intervalMs);
  
  await db.insert(loopMessages).values({
    chatId,
    message,
    intervalMs,
    remainingCount: count,
    lastSent: now,
    nextSend,
    isActive: true,
  });
  
  return true;
}

export async function stopLoopMessage(chatId) {
  await db
    .update(loopMessages)
    .set({ isActive: false })
    .where(eq(loopMessages.chatId, chatId));
  
  return true;
}

export async function getLoopMessage(chatId) {
  const result = await db
    .select()
    .from(loopMessages)
    .where(and(eq(loopMessages.chatId, chatId), eq(loopMessages.isActive, true)));
  
  return result.length > 0 ? result[0] : null;
}

export async function getDueLoopMessages() {
  const now = new Date();
  const msgs = await db
    .select()
    .from(loopMessages)
    .where(and(eq(loopMessages.isActive, true), lte(loopMessages.nextSend, now)));
  
  return msgs;
}

export async function updateLoopMessageAfterSend(id, intervalMs, currentRemaining) {
  const now = new Date();
  const nextSend = new Date(now.getTime() + intervalMs);
  
  if (currentRemaining === -1) {
    await db
      .update(loopMessages)
      .set({ lastSent: now, nextSend })
      .where(eq(loopMessages.id, id));
    return { completed: false, remaining: -1, unlimited: true };
  }
  
  const newRemaining = currentRemaining - 1;
  
  if (newRemaining <= 0) {
    await db
      .update(loopMessages)
      .set({ isActive: false, lastSent: now })
      .where(eq(loopMessages.id, id));
    return { completed: true };
  }
  
  await db
    .update(loopMessages)
    .set({ lastSent: now, nextSend, remainingCount: newRemaining })
    .where(eq(loopMessages.id, id));
  
  return { completed: false, remaining: newRemaining };
}

export async function trackMessage(groupId, messageId, messageType) {
  await db.insert(messageTracking).values({
    groupId,
    messageId,
    messageType,
  });
  return true;
}

export async function getTrackedMessage(groupId, messageId) {
  const result = await db
    .select()
    .from(messageTracking)
    .where(and(eq(messageTracking.groupId, groupId), eq(messageTracking.messageId, messageId)));
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteTrackedMessage(groupId, messageId) {
  await db
    .delete(messageTracking)
    .where(and(eq(messageTracking.groupId, groupId), eq(messageTracking.messageId, messageId)));
  return true;
}

export async function decrementCounter(groupId, type) {
  const data = await getGroupData(groupId);
  if (!data) return false;

  const updateObj = { updatedAt: new Date() };
  
  switch (type) {
    case "sw":
      updateObj.sw = Math.max(0, data.sw - 1);
      break;
    case "doc":
      updateObj.doc = Math.max(0, data.doc - 1);
      break;
    case "text":
      updateObj.text = Math.max(0, data.text - 1);
      break;
    case "audio":
      updateObj.audio = Math.max(0, data.audio - 1);
      break;
    case "sticker":
      updateObj.sticker = Math.max(0, data.sticker - 1);
      break;
    case "oneTime":
      updateObj.oneTime = Math.max(0, data.oneTime - 1);
      break;
    case "link":
      updateObj.link = Math.max(0, data.link - 1);
      break;
    case "media":
      updateObj.media = Math.max(0, data.media - 1);
      break;
    case "nullMsg":
      updateObj.nullMsg = Math.max(0, data.nullMsg - 1);
      break;
    default:
      return false;
  }

  await db
    .update(checkpointData)
    .set(updateObj)
    .where(eq(checkpointData.groupId, groupId));

  return true;
}

export async function createScheduledMessage(targetNumber, message, sendCount, scheduledTime, timezone, creatorChatId) {
  const result = await db.insert(scheduledMessages).values({
    targetNumber,
    message,
    sendCount,
    sentCount: 0,
    scheduledTime,
    timezone,
    creatorChatId,
    isActive: true,
    isCompleted: false,
  }).returning();
  
  return result[0];
}

export async function getDueScheduledMessages() {
  const now = new Date();
  const msgs = await db
    .select()
    .from(scheduledMessages)
    .where(and(
      eq(scheduledMessages.isActive, true),
      eq(scheduledMessages.isCompleted, false),
      lte(scheduledMessages.scheduledTime, now)
    ));
  
  return msgs;
}

export async function updateScheduledMessageAfterSend(id, currentSentCount, totalCount) {
  const newSentCount = currentSentCount + 1;
  
  if (newSentCount >= totalCount) {
    await db
      .update(scheduledMessages)
      .set({ sentCount: newSentCount, isCompleted: true })
      .where(eq(scheduledMessages.id, id));
    return { completed: true, sentCount: newSentCount };
  }
  
  await db
    .update(scheduledMessages)
    .set({ sentCount: newSentCount })
    .where(eq(scheduledMessages.id, id));
  
  return { completed: false, sentCount: newSentCount };
}

export async function getActiveScheduledMessages(creatorChatId) {
  const msgs = await db
    .select()
    .from(scheduledMessages)
    .where(and(
      eq(scheduledMessages.creatorChatId, creatorChatId),
      eq(scheduledMessages.isActive, true),
      eq(scheduledMessages.isCompleted, false)
    ));
  
  return msgs;
}

export async function cancelScheduledMessage(id) {
  await db
    .update(scheduledMessages)
    .set({ isActive: false })
    .where(eq(scheduledMessages.id, id));
  
  return true;
}

export async function markScheduledMessageFailed(id) {
  await db
    .update(scheduledMessages)
    .set({ isActive: false, isCompleted: true })
    .where(eq(scheduledMessages.id, id));
  
  return true;
}
