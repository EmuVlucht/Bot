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

export function parseLoopTime(timeStr) {
  const trimmed = timeStr.trim();
  
  const circumflexLowerCount = (trimmed.match(/î/g) || []).length;
  if (circumflexLowerCount > 0 && trimmed === "î".repeat(circumflexLowerCount)) {
    return circumflexLowerCount * 1000;
  }
  
  const circumflexUpperCount = (trimmed.match(/Î/g) || []).length;
  if (circumflexUpperCount > 0 && trimmed === "Î".repeat(circumflexUpperCount)) {
    return circumflexUpperCount * 2000;
  }
  
  const smallICount = (trimmed.match(/ì/g) || []).length;
  if (smallICount > 0 && trimmed === "ì".repeat(smallICount)) {
    return smallICount * 60 * 1000;
  }
  
  const bigIUmlautCount = (trimmed.match(/Ï/g) || []).length;
  if (bigIUmlautCount > 0 && trimmed === "Ï".repeat(bigIUmlautCount)) {
    return bigIUmlautCount * 10 * 60 * 1000;
  }
  
  const smallILatinCount = (trimmed.match(/i/g) || []).length;
  if (smallILatinCount > 0 && trimmed === "i".repeat(smallILatinCount)) {
    return smallILatinCount * 30 * 60 * 1000;
  }
  
  const bigICount = (trimmed.match(/I/g) || []).length;
  if (bigICount > 0 && trimmed === "I".repeat(bigICount)) {
    return bigICount * 60 * 60 * 1000;
  }
  
  return null;
}

export function parseLoopCommand(text) {
  const stopMatch = text.match(/^∅\s*[:;]\s*0$/);
  if (stopMatch) {
    return { type: "stop" };
  }
  
  const loopWithCountMatch = text.match(/^([îÎ]+)\s*;\s*(\d+)\s*;\s*(.+)$/s);
  if (loopWithCountMatch) {
    const timeStr = loopWithCountMatch[1];
    const count = parseInt(loopWithCountMatch[2], 10);
    const message = loopWithCountMatch[3].trim();
    const intervalMs = parseLoopTime(timeStr);
    
    if (intervalMs && message && count > 0) {
      return { type: "start", intervalMs, message, count, unlimited: false };
    }
  }
  
  const loopSimpleMatch = text.match(/^([îÎ]+)\s*;\s*(.+)$/s);
  if (loopSimpleMatch) {
    const timeStr = loopSimpleMatch[1];
    const message = loopSimpleMatch[2].trim();
    const intervalMs = parseLoopTime(timeStr);
    
    if (intervalMs && message) {
      return { type: "start", intervalMs, message, count: -1, unlimited: true };
    }
  }
  
  return null;
}

export function formatInterval(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} jam ${remainingMinutes} menit`;
  } else if (hours > 0) {
    return `${hours} jam`;
  } else if (minutes > 0) {
    return `${minutes} menit`;
  } else {
    return `${remainingSeconds} detik`;
  }
}
