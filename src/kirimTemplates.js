export const kirimTemplates = {
  salam: "Assalamualaikum",
  
  pagi: "Selamat pagi, semoga harimu menyenangkan!",
  
  siang: "Selamat siang!",
  
  sore: "Selamat sore!",
  
  malam: "Selamat malam, istirahat yang cukup ya!",
  
  makasih: "Terima kasih banyak!",
  
  maaf: "Mohon maaf atas ketidaknyamanannya.",
  
  ingat: "Jangan lupa ya!",
  
};

export function getTemplate(jenis) {
  const key = jenis.toLowerCase();
  return kirimTemplates[key] || null;
}

export function getAvailableTemplates() {
  return Object.keys(kirimTemplates);
}
