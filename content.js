// Content script - Sayfa içeriğiyle etkileşim için
// Şu an temel işlevsellik background.js'de, ancak gelecekte
// sayfa içeriğiyle etkileşim gerekirse bu dosya kullanılabilir

console.log('Metin Seslendirici eklentisi yüklendi');

// Gelecekte kullanılabilecek özellikler:
// - Sayfa içinde özel UI elementleri gösterme
// - Seçili metnin görsel vurgulanması
// - Seslendirme kontrollerini sayfa içinde gösterme
// - Özet sonuçlarını sayfa içinde gösterme

// Background script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Gelecekte gerekli mesaj işlemleri buraya eklenebilir
  return true;
});
