export const autoReplies = [
  {
    trigger: "hallo",
    reply: "hai",
  },
  {
    trigger: "hai",
    reply: "hallo juga!",
  },
];

export function findAutoReply(text) {
  if (!text || typeof text !== "string") return null;
  
  const cleanText = text.trim().toLowerCase();
  
  for (const item of autoReplies) {
    const trigger = item.trigger.toLowerCase();
    
    if (cleanText === trigger) {
      return item.reply;
    }
  }
  
  return null;
}
