export function formatDateTime() {
  const now = new Date();
  
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = now.getUTCFullYear();
  
  return `${hours}:${minutes}:${seconds} ${day}-${month}-${year} (UTC)`;
}

export function formatCheckpointData(data) {
  const dateTime = formatDateTime();
  
  return `${dateTime}

${data.sw} Sw
${data.doc} Doc
${data.text} Text
${data.audio} Audio
${data.sticker} Sticker
${data.oneTime} 1×
${data.link} Link
${data.nullMsg} Null`;
}

export function formatAllGroupsData(groupsData) {
  const dateTime = formatDateTime();
  
  let message = dateTime + "\n";
  
  for (const group of groupsData) {
    message += `\nGrup ${group.groupName}\n`;
    message += `${group.data.sw} Sw\n`;
    message += `${group.data.doc} Doc\n`;
    message += `${group.data.text} Text\n`;
    message += `${group.data.audio} Audio\n`;
    message += `${group.data.sticker} Sticker\n`;
    message += `${group.data.oneTime} 1×\n`;
    message += `${group.data.link} Link\n`;
    message += `${group.data.nullMsg} Null\n`;
  }
  
  return message;
}

export function parseInitData(text) {
  const data = {
    sw: 0,
    doc: 0,
    text: 0,
    audio: 0,
    sticker: 0,
    oneTime: 0,
    link: 0,
    nullMsg: 0,
  };
  
  const lines = text.split("\n");
  
  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const type = match[2].trim().toLowerCase();
      
      if (type === "sw") data.sw = num;
      else if (type === "doc") data.doc = num;
      else if (type === "text") data.text = num;
      else if (type === "audio") data.audio = num;
      else if (type === "sticker") data.sticker = num;
      else if (type === "1×" || type === "1x") data.oneTime = num;
      else if (type === "link") data.link = num;
      else if (type === "null") data.nullMsg = num;
    }
  }
  
  return data;
}

export function containsLink(text) {
  if (!text) return false;
  const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]*)/gi;
  return urlPattern.test(text);
}

export function isOwner(sender, ownerNumber) {
  const cleanSender = sender.replace("@s.whatsapp.net", "").replace("@c.us", "");
  const cleanOwner = ownerNumber.replace(/[^0-9]/g, "");
  return cleanSender === cleanOwner;
}
