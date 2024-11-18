import { db } from "./db.js";
import { authSessions } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { BufferJSON } from "@whiskeysockets/baileys";

function serialize(data) {
  return JSON.parse(JSON.stringify(data, BufferJSON.replacer));
}

function deserialize(data) {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data), BufferJSON.reviver);
}

export async function getSession(sessionId) {
  try {
    const result = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.sessionId, sessionId));

    if (result.length > 0) {
      return deserialize(result[0].data);
    }
    return null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function saveSession(sessionId, data) {
  try {
    const serialized = serialize(data);
    
    const existing = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.sessionId, sessionId));

    if (existing.length > 0) {
      await db
        .update(authSessions)
        .set({ data: serialized, updatedAt: new Date() })
        .where(eq(authSessions.sessionId, sessionId));
    } else {
      await db.insert(authSessions).values({ sessionId, data: serialized });
    }
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

export async function deleteSession(sessionId) {
  try {
    await db.delete(authSessions).where(eq(authSessions.sessionId, sessionId));
  } catch (error) {
    console.error("Error deleting session:", error);
  }
}

export async function clearAllSessions() {
  try {
    await db.delete(authSessions);
    console.log("All sessions cleared from database");
  } catch (error) {
    console.error("Error clearing sessions:", error);
  }
}

export async function initDBAuthState() {
  const credsData = await getSession("creds");

  const state = {
    creds: credsData || undefined,
    keys: {
      get: async (type, ids) => {
        const data = {};
        for (const id of ids) {
          const key = `${type}-${id}`;
          const value = await getSession(key);
          if (value) {
            data[id] = value;
          }
        }
        return data;
      },
      set: async (data) => {
        const promises = [];
        for (const [type, typeData] of Object.entries(data)) {
          for (const [id, value] of Object.entries(typeData)) {
            const key = `${type}-${id}`;
            if (value) {
              promises.push(saveSession(key, value));
            } else {
              promises.push(deleteSession(key));
            }
          }
        }
        await Promise.all(promises);
      },
    },
  };

  const saveCreds = async () => {
    if (state.creds) {
      await saveSession("creds", state.creds);
    }
  };

  return { state, saveCreds };
}
