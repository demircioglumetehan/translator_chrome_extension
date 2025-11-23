# 🔊 Metin Seslendirici ve Özetleyici Chrome Eklentisi

Web sayfalarındaki seçili metinleri seslendirebilen ve n8n ile entegre çalışan güçlü bir Chrome eklentisi.

## ✨ Özellikler

- 🗣️ **Metin Seslendirme (Text-to-Speech)**: Seçili metinleri 11 farklı dilde seslendirir
- 🌍 **Çoklu Dil Desteği**: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca ve daha fazlası
- ⚙️ **Özelleştirilebilir Ses Ayarları**: Ses hızı ve ton ayarları
- 🔗 **n8n Entegrasyonu**: Seçili metinleri n8n webhook'una gönderir
- 🎯 **Sağ Tıklama Menüsü**: Kolay erişim için context menu desteği
- 💾 **Ayar Kaydetme**: Tüm ayarlarınız otomatik olarak saklanır
- 🧪 **Test Modu**: Eklenti içinden ayarlarınızı test edin

## 📦 Kurulum

### 1. Eklentiyi İndirin

```bash
git clone https://github.com/kullanici/translator_chrome_extension.git
cd translator_chrome_extension
```

### 2. Chrome'a Yükleyin

1. Chrome tarayıcınızı açın
2. Adres çubuğuna `chrome://extensions/` yazın
3. Sağ üst köşeden **"Geliştirici modu"** aktif edin
4. **"Paketlenmemiş öğe yükle"** butonuna tıklayın
5. İndirdiğiniz `translator_chrome_extension` klasörünü seçin
6. Eklenti yüklenecek ve kullanıma hazır olacaktır

## 🚀 Kullanım

### Temel Kullanım

1. **Metni Seslendirme:**
   - Bir web sayfasında metni seçin
   - Sağ tıklayın
   - **"Metni Seslendir"** seçeneğini tıklayın
   - Metin seçili dilde seslendirilecektir

2. **Metni Özetleme (n8n):**
   - Bir web sayfasında metni seçin
   - Sağ tıklayın
   - **"Metni Özetle"** seçeneğini tıklayın
   - Metin n8n webhook'unuza gönderilecektir

### Ayarlar

Eklenti ikonuna tıklayarak ayarlar panelini açın:

#### 🗣️ Ses Ayarları

- **Dil Seçimi**: 11 farklı dil arasından seçim yapın
  - Türkçe (tr-TR)
  - İngilizce (US/UK)
  - Almanca, Fransızca, İspanyolca, İtalyanca
  - Rusça, Japonca, Çince, Arapça

- **Hız**: Seslendirme hızını ayarlayın (0.5x - 2.0x)
- **Ton**: Ses tonunu ayarlayın (0.5 - 2.0)

#### 🔗 n8n Entegrasyonu

- **Webhook URL**: n8n webhook URL'nizi girin
  - Örnek: `https://your-n8n.com/webhook/summarize`

### n8n Kurulumu

1. n8n'de yeni bir workflow oluşturun
2. **Webhook** node'u ekleyin
3. Webhook URL'sini kopyalayın
4. Eklenti ayarlarına yapıştırın
5. Gelen veriyi işlemek için node'lar ekleyin

#### Örnek n8n Webhook Veri Formatı

```json
{
  "text": "Seçili metin buraya gelir",
  "timestamp": "2025-11-23T10:30:00.000Z",
  "source": "chrome-extension"
}
```

## 🧪 Test Etme

Eklenti popup'ında test alanı bulunur:

1. **Test Metni Girin**: Alttaki metin kutusuna bir şey yazın
2. **🔊 Seslendir**: Metni test için seslendirin
3. **⏹ Durdur**: Seslendirmeyi durdurun
4. **📤 Webhook Test**: n8n bağlantısını test edin

## 📁 Proje Yapısı

```
translator_chrome_extension/
├── manifest.json          # Eklenti yapılandırması
├── background.js          # Arka plan script (TTS + n8n)
├── popup.html            # Eklenti arayüzü
├── popup.js              # Popup fonksiyonları
├── styles.css            # Arayüz stilleri
├── content.js            # Content script
├── icons/                # Eklenti ikonları
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── create_icons.py       # İkon oluşturma scripti
└── README.md             # Bu dosya
```

## 🎨 Özelleştirme

### İkonları Değiştirme

1. `icons/icon.svg` dosyasını düzenleyin
2. `create_icons.py` scriptini çalıştırın:

```bash
pip install Pillow
python3 create_icons.py
```

### Dil Ekleme

`popup.html` dosyasındaki `<select id="language">` bölümüne yeni diller ekleyebilirsiniz:

```html
<option value="pt-BR">Portekizce</option>
```

## 🔧 Geliştirme

### Gereksinimler

- Chrome/Chromium tabanlı tarayıcı
- Python 3.x (ikonlar için)
- Pillow kütüphanesi (ikonlar için)

### Debug Modu

1. `chrome://extensions/` sayfasını açın
2. Eklentinin altındaki **"background page"** linkine tıklayın
3. Console'da hata mesajlarını görün

## 🐛 Bilinen Sorunlar ve Çözümler

### Seslendirme Çalışmıyor

- Dil ayarlarınızı kontrol edin
- Chrome'un ses çıkışı olduğundan emin olun
- Sistem TTS desteğini kontrol edin

### n8n Bağlantı Hatası

- Webhook URL'sinin doğru olduğundan emin olun
- CORS ayarlarını kontrol edin
- n8n'in webhook'u aktif olduğundan emin olun

## 📝 Gelecek Özellikler

- [ ] Özetleme sonuçlarını popup'ta gösterme
- [ ] Çeviri özelliği ekleme
- [ ] Klavye kısayolları
- [ ] Tema desteği (dark/light mode)
- [ ] Seslendirme geçmişi
- [ ] Batch seslendirme
- [ ] PDF desteği

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Push edin (`git push origin feature/yeniOzellik`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

Metehan Demircioğlu

## 🙏 Teşekkürler

- Chrome TTS API
- n8n workflow automation
- Tüm katkıda bulunanlara

---

**Not**: Bu eklenti yerel olarak çalışır ve verileriniz sadece seçtiğiniz n8n webhook'una gönderilir. Hiçbir üçüncü taraf servise veri gönderilmez.

## 💡 İpuçları

- **Performans**: Çok uzun metinleri seslendirirken hız ayarını artırın
- **n8n**: Webhook'tan gelen metni AI ile özetlemek için OpenAI/Claude node'u kullanabilirsiniz
- **Güvenlik**: Webhook URL'nizi kimseyle paylaşmayın
- **Test**: Her yeni ayar yaptığınızda test butonunu kullanın

Keyifli kullanımlar! 🎉
