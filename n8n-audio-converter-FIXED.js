/**
 * DOĞRU N8N Code Node (Audio Binary to Base64 Converter)
 *
 * NOT: OpenAI TTS node'dan gelen binary data yapısı değişebiliyor.
 * Bu kod farklı yapıları handle eder.
 */

// Tüm input item'ları al
const items = $input.all();

if (!items || items.length === 0) {
  throw new Error('Hiç item bulunamadı');
}

const item = items[0];

// OpenAI TTS node'undan gelen veriyi logla
console.log('=== Debug: Item yapısı ===');
console.log('Binary keys:', Object.keys(item.binary || {}));
console.log('JSON keys:', Object.keys(item.json || {}));

// Binary data'yı bul
let binaryKey = 'data'; // OpenAI TTS genelde 'data' kullanır
let binaryData = item.binary?.[binaryKey];

// Eğer 'data' yoksa, ilk binary key'i kullan
if (!binaryData && item.binary) {
  const keys = Object.keys(item.binary);
  if (keys.length > 0) {
    binaryKey = keys[0];
    binaryData = item.binary[binaryKey];
    console.log(`'data' bulunamadı, '${binaryKey}' kullanılıyor`);
  }
}

if (!binaryData) {
  throw new Error('Binary data bulunamadı. OpenAI TTS node çalıştı mı?');
}

console.log('Binary data yapısı:', {
  id: binaryData.id,
  mimeType: binaryData.mimeType,
  fileExtension: binaryData.fileExtension,
  dataSize: binaryData.data?.length || binaryData.data?.byteLength || 'unknown'
});

// Binary data'yı Buffer'a çevir
let buffer;

if (Buffer.isBuffer(binaryData.data)) {
  // Zaten Buffer ise
  buffer = binaryData.data;
  console.log('Data zaten Buffer formatında');
} else if (binaryData.data instanceof Uint8Array) {
  // Uint8Array ise Buffer'a çevir
  buffer = Buffer.from(binaryData.data);
  console.log('Data Uint8Array formatından Buffer\'a çevrildi');
} else if (typeof binaryData.data === 'string') {
  // String ise (base64 veya başka format)
  // DIKKAT: Eğer zaten base64 ise tekrar encode etmeyin!
  if (binaryData.data.startsWith('data:')) {
    // Data URL formatında ise
    const base64String = binaryData.data.split(',')[1];
    console.log('Data URL tespit edildi, base64 kısmı alınıyor');
    return [{
      json: {
        success: true,
        audioBase64: base64String,
        mimeType: binaryData.mimeType || 'audio/mpeg',
        translatedText: item.json.output || item.json.text || ''
      }
    }];
  } else {
    // Base64 string ise direkt kullan
    console.log('Data string formatında (muhtemelen base64)');
    return [{
      json: {
        success: true,
        audioBase64: binaryData.data,
        mimeType: binaryData.mimeType || 'audio/mpeg',
        translatedText: item.json.output || item.json.text || ''
      }
    }];
  }
} else {
  // Diğer durumlar için generic çözüm
  buffer = Buffer.from(binaryData.data);
  console.log('Data generic yöntemle Buffer\'a çevrildi');
}

// Buffer'ı base64'e çevir
const audioBase64 = buffer.toString('base64');

// Çevrilmiş metni al
const translatedText = item.json.output || item.json.text || '';

console.log('=== Sonuç ===');
console.log('Base64 length:', audioBase64.length);
console.log('First 50 chars:', audioBase64.substring(0, 50));
console.log('Last 50 chars:', audioBase64.substring(audioBase64.length - 50));
console.log('MIME type:', binaryData.mimeType);

return [{
  json: {
    success: true,
    audioBase64: audioBase64,
    mimeType: binaryData.mimeType || 'audio/mpeg',
    translatedText: translatedText
  }
}];
