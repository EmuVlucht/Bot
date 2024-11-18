import { db } from "./db.js";
import { groups, checkpointData, liveMessages } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

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
    case "nullMsg":
      updateObj.nullMsg = data.nullMsg + 1;
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
      nullMsg: currentData.nullMsg + (data.nullMsg || 0),
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
