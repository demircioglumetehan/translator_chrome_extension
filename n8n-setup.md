# n8n Kurulum Kılavuzu

Bu dosya Chrome eklentisi ile n8n entegrasyonunu kurmak için detaylı talimatlar içerir.

## 🚀 Hızlı Başlangıç

### 1. n8n'i Kurun

Eğer henüz n8n kurulu değilse:

```bash
# Docker ile
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# NPM ile
npm install n8n -g
n8n start
```

### 2. Örnek Workflow'u İçe Aktarın

1. n8n arayüzünü açın (varsayılan: http://localhost:5678)
2. Sol üst köşedeki menüden **"Import from File"** seçin
3. `n8n-example-workflow.json` dosyasını seçin
4. Workflow içe aktarılacaktır

### 3. Webhook URL'sini Alın

1. Workflow'da **"Webhook"** node'una tıklayın
2. **"Test URL"** veya **"Production URL"** kopyalayın
3. Chrome eklentisi ayarlarına yapıştırın

Örnek URL formatı:
```
http://localhost:5678/webhook/chrome-summarize
```

veya production için:
```
https://your-n8n-domain.com/webhook/chrome-summarize
```

## 🔧 Workflow Açıklaması

Örnek workflow şu adımları içerir:

### 1. Webhook Node
- Chrome eklentisinden gelen POST isteklerini dinler
- Gelen veri formatı:
  ```json
  {
    "text": "Seçili metin",
    "timestamp": "2025-11-23T10:30:00.000Z",
    "source": "chrome-extension"
  }
  ```

### 2. Veriyi Ayıkla Node
- Gelen metni ayıklar
- Karakter sayısını hesaplar
- Zaman damgasını işler

### 3. Özet Oluştur Node (Placeholder)
- **ÖNEMLİ**: Bu node'u bir AI servisi ile değiştirmelisiniz
- Önerilen servisler:
  - OpenAI (ChatGPT)
  - Anthropic (Claude)
  - Google (Gemini)
  - Ollama (yerel)

### 4. Webhook'a Yanıt Dön Node
- İşlenen sonucu Chrome eklentisine geri gönderir
- Yanıt formatı:
  ```json
  {
    "success": true,
    "summary": "Özet metin",
    "characterCount": 150,
    "timestamp": "2025-11-23T10:30:05.000Z"
  }
  ```

## 🤖 AI Servisi Entegrasyonu

### OpenAI ile Kullanım

1. **OpenAI** node'u ekleyin
2. API key'inizi girin
3. Prompt'u ayarlayın:

```
Aşağıdaki metni kısa ve öz bir şekilde özetle:

{{ $json.text }}

Özeti maksimum 3-4 cümle ile sınırla.
```

4. **Model**: `gpt-3.5-turbo` veya `gpt-4`
5. **Max Tokens**: 200-300

### Claude (Anthropic) ile Kullanım

1. **HTTP Request** node'u ekleyin
2. URL: `https://api.anthropic.com/v1/messages`
3. Method: `POST`
4. Headers:
   ```json
   {
     "x-api-key": "YOUR_ANTHROPIC_API_KEY",
     "anthropic-version": "2023-06-01",
     "content-type": "application/json"
   }
   ```
5. Body:
   ```json
   {
     "model": "claude-3-haiku-20240307",
     "max_tokens": 300,
     "messages": [
       {
         "role": "user",
         "content": "Aşağıdaki metni özetle: {{ $json.text }}"
       }
     ]
   }
   ```

### Ollama (Yerel AI) ile Kullanım

1. Ollama'yı kurun: https://ollama.ai
2. Bir model indirin: `ollama pull llama2`
3. **HTTP Request** node'u ekleyin
4. URL: `http://localhost:11434/api/generate`
5. Method: `POST`
6. Body:
   ```json
   {
     "model": "llama2",
     "prompt": "Şu metni özetle: {{ $json.text }}",
     "stream": false
   }
   ```

## 📊 Gelişmiş Özellikler

### Özet Sonuçlarını Kaydetme

**Google Sheets Node** ekleyerek tüm özetleri kaydedin:

1. Google Sheets node ekleyin
2. Spreadsheet seçin
3. Columns:
   - Timestamp: `{{ $json.timestamp }}`
   - Original Text: `{{ $json.text }}`
   - Summary: `{{ $json.summary }}`
   - Character Count: `{{ $json.characterCount }}`

### Slack/Discord Bildirimi

Özet oluşturulduğunda bildirim gönderin:

1. Slack/Discord node ekleyin
2. Webhook URL girin
3. Message:
   ```
   📝 Yeni özet oluşturuldu!

   Özet: {{ $json.summary }}
   Karakter sayısı: {{ $json.characterCount }}
   ```

### Email ile Özet Gönderme

1. **Send Email** node'u ekleyin
2. SMTP ayarlarını yapın
3. Subject: `Metin Özeti - {{ $now.format('DD/MM/YYYY HH:mm') }}`
4. Body: Özet içeriği

## 🔒 Güvenlik

### Webhook'u Koruma

1. **Authentication** ekleyin:
   - Webhook node'unda "Header Auth" seçin
   - Secret key belirleyin
   - Chrome eklentisinde header gönderin

2. **IP Kısıtlaması**:
   - n8n'de IP whitelist kullanın
   - Sadece belirli IP'lerden isteklere izin verin

3. **Rate Limiting**:
   - Çok fazla istek gelmesini önleyin
   - n8n execution limit ayarlayın

## 🐛 Sorun Giderme

### Webhook Çalışmıyor

- n8n'in çalıştığından emin olun
- Webhook URL'sinin doğru olduğunu kontrol edin
- Production URL kullanıyorsanız workflow'u aktif edin
- CORS hatası alıyorsanız n8n ayarlarını kontrol edin

### Özet Oluşturulmuyor

- AI servisi API key'lerini kontrol edin
- Token limitlerini kontrol edin
- n8n execution log'larına bakın
- AI servisinizin rate limit'ine takılmadığınızı kontrol edin

### Yavaş Yanıt

- Daha hızlı bir AI modeli kullanın
- Max tokens sayısını azaltın
- Timeout ayarlarını artırın

## 📚 Örnek Kullanım Senaryoları

### 1. Blog Yazısı Özetleme

```
Uzun blog yazılarını seçip hızlıca özetleyin.
Özeti Notion veya Evernote'a kaydedin.
```

### 2. Akademik Makale Özeti

```
Araştırma makalelerini seçip ana noktaları çıkarın.
Google Sheets'te makale veritabanı oluşturun.
```

### 3. Haber Özeti

```
Uzun haberleri özetleyip Telegram'a gönderin.
Günlük özet raporu oluşturun.
```

### 4. YouTube Altyazı Özeti

```
YouTube transcript'lerini özetleyin.
Video notlarını otomatik oluşturun.
```

## 🎯 İpuçları

- **Prompt Engineering**: İyi promptlar yazarak daha iyi özetler alın
- **Dil Ayarı**: Özet dilini prompt'ta belirtin
- **Uzunluk**: Max tokens ile özet uzunluğunu kontrol edin
- **Format**: İstediğiniz formatta (bullet points, paragraf, etc.) özet isteyin

## 📖 Daha Fazla Bilgi

- n8n Dokümantasyon: https://docs.n8n.io
- n8n Community: https://community.n8n.io
- OpenAI API: https://platform.openai.com/docs
- Anthropic API: https://docs.anthropic.com

---

Sorularınız için GitHub Issues kullanabilirsiniz!
