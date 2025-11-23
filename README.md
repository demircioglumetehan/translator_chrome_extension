# 🔊 Chrome Metin Seslendirici ve Özetleyici

ChatGPT ve OpenAI TTS ile çalışan, seçili metinleri çevirip seslendiren ve özetleyen Chrome eklentisi.

## ✨ Özellikler

- 🗣️ **Özel TTS**: OpenAI TTS ile doğal ve kaliteli seslendirme
- 🌍 **Çoklu Dil Desteği**: 13+ dil için çeviri ve seslendirme
- 📝 **Akıllı Özetleme**: ChatGPT ile metin özetleme
- 🎯 **Sağ Tık Menüsü**: Herhangi bir metni seçip hızlıca işlem yapın
- 🎨 **Modern UI**: Sayfa içi özet gösterimi ve bildirimler
- ⚡ **n8n Entegrasyonu**: Esnek ve özelleştirilebilir iş akışları

## 📸 Nasıl Çalışır

### Sağ Tık Menüsü
Herhangi bir metni seçip sağ tıklayın:
- **Metni Seslendir**: Metni seçili dile çevirir ve seslendirir
- **Metni Özetle**: Metni özetler ve seçili dile çevirir

### Özet Popup
Özetleme sonrası sayfa içinde modern bir popup gösterilir:
- Özet metni
- İstatistikler (orijinal uzunluk, özet uzunluk, sıkıştırma oranı)
- Kopyalama ve seslendirme butonları

## 🚀 Kurulum

### 1. Chrome Eklentisini Yükleyin

1. Bu repoyu klonlayın veya indirin
2. Chrome'da `chrome://extensions/` adresine gidin
3. Sağ üstte "Geliştirici modu"nu açın
4. "Paketlenmemiş öğe yükle" butonuna tıklayın
5. Proje klasörünü seçin

### 2. n8n Workflow'unu Kurun

**Detaylı kurulum için:** [N8N_WORKFLOW_GUIDE.md](./N8N_WORKFLOW_GUIDE.md)

#### Hızlı Adımlar:

1. **n8n'de workflow oluşturun**:
   - `n8n-workflow-complete.json` dosyasını n8n'e import edin
   - VEYA manuel olarak workflow'u oluşturun (rehbere bakın)

2. **OpenAI API Key ekleyin**:
   - n8n Credentials'a OpenAI API anahtarınızı ekleyin
   - API anahtarı almak için: https://platform.openai.com/api-keys

3. **Webhook URL'ini kopyalayın**:
   - n8n'deki Webhook node'undan URL'yi kopyalayın
   - Örnek: `https://your-n8n.com/webhook/chrome-tts-extension`

### 3. Eklentiyi Yapılandırın

1. Chrome'da eklenti ikonuna tıklayın
2. **Hedef Dil** seçin (metin bu dile çevrilecek)
3. **Webhook URL** alanına n8n webhook URL'sini yapıştırın
4. "💾 Ayarları Kaydet" butonuna tıklayın

## 📖 Kullanım

### Metni Seslendirme

1. Web sayfasında bir metni seçin
2. Sağ tıklayıp "**Metni Seslendir**" seçin
3. Metin:
   - Seçtiğiniz dile çevrilir
   - OpenAI TTS ile seslendirilir
   - Otomatik olarak oynatılır

### Metni Özetleme

1. Web sayfasında bir metni seçin
2. Sağ tıklayıp "**Metni Özetle**" seçin
3. Özet:
   - Sayfa içinde popup olarak gösterilir
   - Chrome bildirimi olarak gösterilir
   - Kopyalanabilir ve seslendirilebilir

### Test Etme

Eklenti popup'ında:
1. Test metni girin
2. "🔊 Seslendir" - Seslendirme testi
3. "📤 Webhook Test" - Özetleme testi

## 🔧 Teknik Detaylar

### Mimari

```
Chrome Eklentisi → n8n Webhook → ChatGPT (Çeviri/Özetleme) → OpenAI TTS → Chrome Eklentisi
```

### Seslendirme Akışı

1. Kullanıcı metni seçer ve "Seslendir" tıklar
2. Chrome Extension metni n8n webhook'una gönderir
3. ChatGPT metni hedef dile çevirir
4. OpenAI TTS çevrilmiş metni seslendirir
5. Ses dosyası base64 olarak Chrome'a döner
6. Chrome ses dosyasını oynatır

### Özetleme Akışı

1. Kullanıcı metni seçer ve "Özetle" tıklar
2. Chrome Extension metni n8n webhook'una gönderir
3. ChatGPT metni özetler ve hedef dile çevirir
4. Özet Chrome'a döner
5. Chrome özeti popup ve bildirim olarak gösterir

### Teknolojiler

- **Frontend**: Chrome Extension API (Manifest V3)
- **Backend**: n8n Workflow Automation
- **AI/ML**: OpenAI GPT-3.5/4, OpenAI TTS
- **Audio**: HTML5 Audio API, Base64 encoding

## 📂 Dosya Yapısı

```
translator_chrome_extension/
├── manifest.json              # Chrome eklenti yapılandırması
├── background.js              # Arka plan scriptleri (TTS, özetleme)
├── content.js                 # Sayfa içi scriptler (özet popup)
├── popup.html                 # Eklenti ayarları UI
├── popup.js                   # Ayarlar mantığı
├── styles.css                 # Popup stilleri
├── icons/                     # Eklenti ikonları
├── README.md                  # Bu dosya
├── N8N_WORKFLOW_GUIDE.md      # n8n kurulum rehberi
└── n8n-workflow-complete.json # Import edilebilir workflow
```

## 🎯 Desteklenen Diller

- 🇹🇷 Türkçe
- 🇬🇧 İngilizce
- 🇩🇪 Almanca
- 🇫🇷 Fransızca
- 🇪🇸 İspanyolca
- 🇮🇹 İtalyanca
- 🇷🇺 Rusça
- 🇯🇵 Japonca
- 🇨🇳 Çince
- 🇸🇦 Arapça
- 🇵🇹 Portekizce
- 🇳🇱 Hollandaca
- 🇰🇷 Korece

## 💡 İpuçları

### Maliyet Optimizasyonu

- **GPT Model**: GPT-3.5-turbo önerilir (ucuz ve yeterli)
- **TTS Model**: `tts-1` hızlı ve ucuz, `tts-1-hd` daha kaliteli
- **Prompt**: Kısa promptlar kullanın, token tasarrufu yapın

### Ses Seçimi

n8n workflow'unda OpenAI TTS node'da değiştirebilirsiniz:
- `alloy` - Nötr, profesyonel
- `nova` - Kadın ses (önerilen)
- `echo` - Erkek ses
- `shimmer` - Yumuşak kadın ses

### Hata Ayıklama

1. Chrome DevTools Console'u açın (F12)
2. Background script loglarını kontrol edin
3. n8n workflow execution history'yi kontrol edin
4. Network sekmesinde webhook isteklerini kontrol edin

## 🐛 Bilinen Sorunlar

- **Audio oynatma**: Bazı sitelerde CSP (Content Security Policy) nedeniyle ses oynatılamayabilir
- **Popup gösterimi**: Bazı sitelerde z-index çakışması olabilir
- **Clipboard**: Bazı tarayıcılarda panoya kopyalama çalışmayabilir

## 🔒 Güvenlik

- API anahtarları n8n'de saklanır (Chrome'da değil)
- Webhook HTTPS üzerinden çalışmalıdır
- Kullanıcı verisi sadece işlem sırasında kullanılır, saklanmaz

## 🚧 Gelecek Özellikler

- [ ] Birden fazla ses seçeneği (UI'dan seçilebilir)
- [ ] Özel prompt şablonları
- [ ] Ses hızı ve ton kontrolü
- [ ] Uzun metin bölümleme
- [ ] Çeviri geçmişi
- [ ] Favoriler ve kayıtlar

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'feat: Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 👨‍💻 Geliştirici

Metehan Demircioğlu

---

**Made with ❤️ using OpenAI, n8n, and Chrome Extensions**
