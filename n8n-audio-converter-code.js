/**
 * N8N Code Node - Audio Binary to Base64 Converter
 *
 * Bu kod OpenAI TTS node'dan gelen binary audio verisini
 * Chrome Extension'ın anlayabileceği base64 formatına çevirir.
 *
 * Kullanım:
 * 1. OpenAI TTS node'dan sonra yeni bir Code Node ekleyin
 * 2. Bu kodu Code Node'a yapıştırın
 * 3. Mode: "Run Once for All Items" olarak ayarlayın
 */

// Tüm input item'ları al
const items = $input.all();

// İlk item'ı kontrol et
if (!items || items.length === 0) {
  throw new Error('Hiç item bulunamadı');
}

const firstItem = items[0];

// Binary audio data'yı bul
// OpenAI TTS node'u binary veriyi 'audio' key'i altında saklar
const binaryData = firstItem.binary?.audio;

if (!binaryData) {
  // Eğer 'audio' key'i yoksa, tüm binary key'leri kontrol et
  const binaryKeys = Object.keys(firstItem.binary || {});

  if (binaryKeys.length === 0) {
    throw new Error('Binary audio data bulunamadı. OpenAI TTS node çalıştı mı?');
  }

  // İlk binary key'i kullan
  const firstBinaryKey = binaryKeys[0];
  console.log(`'audio' key bulunamadı, '${firstBinaryKey}' kullanılıyor`);
  binaryData = firstItem.binary[firstBinaryKey];
}

// Binary data'nın yapısını kontrol et
if (!binaryData.data) {
  throw new Error('Binary data yapısı beklenenden farklı');
}

// Binary data'yı base64'e çevir
let audioBase64;

if (Buffer.isBuffer(binaryData.data)) {
  // Eğer data zaten Buffer ise direkt toString kullan
  audioBase64 = binaryData.data.toString('base64');
} else if (binaryData.data instanceof Uint8Array) {
  // Eğer Uint8Array ise Buffer'a çevir
  audioBase64 = Buffer.from(binaryData.data).toString('base64');
} else {
  // Diğer durumlar için generic çözüm
  audioBase64 = Buffer.from(binaryData.data).toString('base64');
}

// MIME type'ı belirle
const mimeType = binaryData.mimeType || 'audio/mpeg';

// Çevrilmiş metni al (ChatGPT node'dan)
// Farklı node'lar farklı key'ler kullanabilir
const translatedText =
  firstItem.json.output ||        // ChatGPT node genelde 'output' kullanır
  firstItem.json.text ||           // Bazı node'lar 'text' kullanır
  firstItem.json.translatedText || // Özel ayarlanmışsa
  '';

// Debug için bilgileri logla
console.log('Audio converted successfully:', {
  audioSize: audioBase64.length,
  mimeType: mimeType,
  translatedTextLength: translatedText.length
});

// Chrome Extension'ın beklediği formatta response döndür
return [{
  json: {
    success: true,
    audioBase64: audioBase64,
    mimeType: mimeType,
    translatedText: translatedText
  }
}];
