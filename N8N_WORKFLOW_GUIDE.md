# 🔧 N8N Workflow Kurulum Rehberi

Bu Chrome eklentisi, metin çevirisi ve seslendirme için n8n workflow'u kullanır.

## 📊 Workflow Yapısı

### 1️⃣ SESLENDIRME AKIŞI (TTS)

```
Webhook ➜ IF (Action Check) ➜ ChatGPT (Çeviri) ➜ OpenAI TTS ➜ Base64 Converter ➜ Response
```

**Adımlar:**

1. **Webhook Node**: Chrome eklentisinden gelen istekleri dinler
   - Method: POST
   - Path: `/chrome-tts-extension`
   - Expected Data:
     ```json
     {
       "text": "Seslendirilecek metin",
       "targetLanguage": "Turkish",
       "action": "speak"
     }
     ```

2. **IF Node**: Action türünü kontrol eder
   - Condition: `{{ $json.body.action }}` equals `speak`

3. **OpenAI ChatGPT Node**: Metni hedef dile çevirir
   - Model: `gpt-4` veya `gpt-3.5-turbo`
   - Prompt:
     ```
     Translate the following text to {{ $json.body.targetLanguage }}.
     Only return the translated text, nothing else:

     {{ $json.body.text }}
     ```

4. **OpenAI TTS Node**: Çevrilmiş metni seslendirir
   - Model: `tts-1-hd` (yüksek kalite) veya `tts-1` (hızlı)
   - Voice: `alloy`, `echo`, `fable`, `onyx`, `nova`, veya `shimmer`
   - Input: `{{ $json.output }}` (ChatGPT'den gelen çevrilmiş metin)
   - Response Format: `mp3`

5. **Code Node** (Base64 Dönüştürücü):
   ```javascript
   // Binary veriyi base64'e çevir
   const binaryData = items[0].binary.audio;
   const audioBase64 = Buffer.from(binaryData.data).toString('base64');

   return [{
     json: {
       audioBase64: audioBase64,
       mimeType: 'audio/mpeg',
       translatedText: items[0].json.output
     }
   }];
   ```

6. **Respond to Webhook Node**: Chrome eklentisine yanıt döner
   ```json
   {
     "success": true,
     "audioBase64": "{{ $json.audioBase64 }}",
     "mimeType": "audio/mpeg",
     "translatedText": "{{ $json.translatedText }}"
   }
   ```

---

### 2️⃣ ÖZETLEME AKIŞI

```
Webhook ➜ IF (Action Check) ➜ ChatGPT (Özetleme + Çeviri) ➜ Response
```

**Adımlar:**

1. **Webhook Node**: Aynı webhook'u kullanır

2. **IF Node**: Action türünü kontrol eder
   - Condition: `{{ $json.body.action }}` equals `summarize`

3. **OpenAI ChatGPT Node**: Metni özetler ve hedef dile çevirir
   - Model: `gpt-4` veya `gpt-3.5-turbo`
   - Prompt:
     ```
     Summarize the following text in {{ $json.body.targetLanguage }}.
     Make it concise (max 3-4 sentences) and clear:

     {{ $json.body.text }}
     ```

4. **Code Node** (Uzunluk Hesaplama):
   ```javascript
   const summary = items[0].json.output;
   const originalText = items[0].json.body.text;

   return [{
     json: {
       summary: summary,
       originalLength: originalText.length,
       summaryLength: summary.length,
       compressionRatio: (summary.length / originalText.length * 100).toFixed(2) + '%'
     }
   }];
   ```

5. **Respond to Webhook Node**: Chrome eklentisine yanıt döner
   ```json
   {
     "success": true,
     "summary": "{{ $json.summary }}",
     "originalLength": "{{ $json.originalLength }}",
     "summaryLength": "{{ $json.summaryLength }}",
     "compressionRatio": "{{ $json.compressionRatio }}"
   }
   ```

---

## 🚀 Kurulum Adımları

### 1. N8N'de Yeni Workflow Oluştur

1. N8N dashboard'una git
2. "New Workflow" butonuna tıkla
3. Workflow'a isim ver: `Chrome Extension TTS & Summarizer`

### 2. Webhook Node Ekle

1. "Add Node" ➜ "Webhook" seç
2. Ayarlar:
   - **HTTP Method**: POST
   - **Path**: `chrome-tts-extension` (veya istediğiniz path)
   - **Respond**: "Using Respond to Webhook Node"
3. Webhook URL'ini kopyala (örnek: `https://your-n8n.com/webhook/chrome-tts-extension`)

### 3. IF Node Ekle (Action Kontrolü)

1. Webhook'a bağla
2. İki dal oluştur:
   - **True Branch**: `{{ $json.body.action }}` equals `speak`
   - **False Branch**: Diğer action'lar için

### 4. Seslendirme Dalını Kur

#### ChatGPT Node (Çeviri):
- **Connection**: OpenAI API credentials ekle
- **Model**: gpt-3.5-turbo veya gpt-4
- **Prompt**:
  ```
  Translate the following text to {{ $json.body.targetLanguage }}. Only return the translated text, nothing else:

  {{ $json.body.text }}
  ```

#### OpenAI TTS Node:
- **Connection**: Aynı OpenAI credentials
- **Model**: tts-1-hd
- **Voice**: nova (veya istediğiniz ses)
- **Input**: `{{ $json.output }}`

#### Code Node (Base64 Converter):
- **Mode**: Run Once for All Items
- **JavaScript Code**:
  ```javascript
  const binaryData = items[0].binary.audio;
  const audioBase64 = Buffer.from(binaryData.data).toString('base64');

  return [{
    json: {
      audioBase64: audioBase64,
      mimeType: 'audio/mpeg',
      translatedText: items[0].json.output
    }
  }];
  ```

#### Respond to Webhook:
- **Response Code**: 200
- **Response Body**:
  ```json
  {
    "success": true,
    "audioBase64": "={{ $json.audioBase64 }}",
    "mimeType": "audio/mpeg",
    "translatedText": "={{ $json.translatedText }}"
  }
  ```

### 5. Özetleme Dalını Kur

IF node'un False dalına:

#### IF Node (Summarize Check):
- **Condition**: `{{ $json.body.action }}` equals `summarize`

#### ChatGPT Node (Özetleme):
- **Model**: gpt-3.5-turbo veya gpt-4
- **Prompt**:
  ```
  Summarize the following text in {{ $json.body.targetLanguage }}. Make it concise (max 3-4 sentences) and clear:

  {{ $json.body.text }}
  ```

#### Code Node (Stats):
```javascript
const summary = items[0].json.output;
const originalText = items[0].json.body.text;

return [{
  json: {
    summary: summary,
    originalLength: originalText.length,
    summaryLength: summary.length,
    compressionRatio: (summary.length / originalText.length * 100).toFixed(2) + '%'
  }
}];
```

#### Respond to Webhook:
```json
{
  "success": true,
  "summary": "={{ $json.summary }}",
  "originalLength": "={{ $json.originalLength }}",
  "summaryLength": "={{ $json.summaryLength }}",
  "compressionRatio": "={{ $json.compressionRatio }}"
}
```

---

## 🔑 OpenAI API Credentials Ekleme

1. N8N'de "Credentials" menüsüne git
2. "Add Credential" ➜ "OpenAI API" seç
3. API Key'inizi girin (OpenAI dashboard'dan alın: https://platform.openai.com/api-keys)
4. Test et ve kaydet

---

## ✅ Test Etme

### Seslendirme Testi:
```bash
curl -X POST https://your-n8n.com/webhook/chrome-tts-extension \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "targetLanguage": "Turkish",
    "action": "speak"
  }'
```

Beklenen yanıt:
```json
{
  "success": true,
  "audioBase64": "SUQzBAAAAAAAI1RTU0UAAAA...",
  "mimeType": "audio/mpeg",
  "translatedText": "Merhaba, bu bir test"
}
```

### Özetleme Testi:
```bash
curl -X POST https://your-n8n.com/webhook/chrome-tts-extension \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    "targetLanguage": "Turkish",
    "action": "summarize"
  }'
```

Beklenen yanıt:
```json
{
  "success": true,
  "summary": "Özet metin burada...",
  "originalLength": 500,
  "summaryLength": 120,
  "compressionRatio": "24.00%"
}
```

---

## 🎯 Workflow'u Aktifleştir

1. N8N workflow editöründe sağ üstteki "Active" toggle'ını aç
2. Webhook URL'ini Chrome eklentisinin ayarlarına yapıştır
3. Chrome eklentisini test et!

---

## 💡 İpuçları

- **Maliyet**: GPT-4 daha iyi ama pahalı. GPT-3.5-turbo çoğu durumda yeterli
- **TTS Model**: `tts-1-hd` daha kaliteli ama yavaş, `tts-1` hızlı ve ucuz
- **Ses Seçimi**:
  - `alloy`: Nötr, profesyonel
  - `echo`: Erkek ses
  - `fable`: İngiliz aksanı
  - `nova`: Kadın ses (önerilen)
  - `onyx`: Derin erkek ses
  - `shimmer`: Yumuşak kadın ses

- **Hata Yönetimi**: Her node'a "On Error" dal ekleyebilirsiniz
- **Rate Limiting**: OpenAI API limitlerinize dikkat edin
- **Caching**: Aynı metinler için cache mekanizması ekleyebilirsiniz

---

## 📚 Kaynaklar

- [N8N Documentation](https://docs.n8n.io/)
- [OpenAI TTS API](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI GPT API](https://platform.openai.com/docs/guides/gpt)

---

**Not**: Workflow dosyası `n8n-workflow-complete.json` olarak da eklendi. Bunu n8n'e import edebilirsiniz!
