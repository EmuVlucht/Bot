export const jadwalShortcuts = {
  "$": "salam",
  "$$": "pagi",
  "$$$": "malam",
};

export const jadwalTemplates = {
  salam: "Assalamualaikum",
  pagi: "Selamat pagi, semoga harimu menyenangkan!",
  siang: "Selamat siang!",
  sore: "Selamat sore!",
  malam: "Selamat malam, istirahat yang cukup ya!",
  makasih: "Terima kasih banyak!",
  maaf: "Mohon maaf atas ketidaknyamanannya.",
  ingat: "Jangan lupa ya!",
};

export function getJadwalTemplate(key) {
  const lowerKey = key.toLowerCase();
  return jadwalTemplates[lowerKey] || null;
}

export function processJadwalMessage(rawMessage) {
  const trimmed = rawMessage.trim();
  
  if (trimmed.startsWith("$ ")) {
    const templateKey = trimmed.substring(2).trim().toLowerCase();
    const template = getJadwalTemplate(templateKey);
    if (template) {
      return template;
    }
  }
  
  return trimmed;
}

export function getAvailableJadwalTemplates() {
  return Object.keys(jadwalTemplates);
}
