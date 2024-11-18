export const config = {
  ownerNumber: process.env.OWNER_NUMBER || "6281234567890",
  
  targetNumber: process.env.TARGET_NUMBER || "6281234567890",
  
  timezone: "Asia/Jayapura",
  
  liveUpdateInterval: 2 * 60 * 1000,
  liveDuration: 15 * 60 * 1000,
  
  cronSchedule: "0 0 * * *",
  
  prefix: ".checkpoint",
};

export function formatOwnerJid(number) {
  const cleaned = number.replace(/[^0-9]/g, "");
  return `${cleaned}@s.whatsapp.net`;
}

export function formatGroupJid(number) {
  return `${number}@g.us`;
}
