// Context menu'leri oluştur
chrome.runtime.onInstalled.addListener(() => {
  // Metni seslendir menüsü
  chrome.contextMenus.create({
    id: 'speakText',
    title: 'Metni Seslendir',
    contexts: ['selection']
  });

  // Metni özetle menüsü
  chrome.contextMenus.create({
    id: 'summarizeText',
    title: 'Metni Özetle',
    contexts: ['selection']
  });

  // Varsayılan ayarları kaydet
  chrome.storage.sync.get(['language', 'n8nWebhook', 'voiceRate', 'voicePitch'], (result) => {
    if (!result.language) {
      chrome.storage.sync.set({ language: 'tr-TR' });
    }
    if (!result.voiceRate) {
      chrome.storage.sync.set({ voiceRate: 1.0 });
    }
    if (!result.voicePitch) {
      chrome.storage.sync.set({ voicePitch: 1.0 });
    }
  });
});

// Context menu tıklamalarını dinle
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;

  if (info.menuItemId === 'speakText') {
    // Metni seslendir
    speakText(selectedText);
  } else if (info.menuItemId === 'summarizeText') {
    // Metni n8n'e gönder
    summarizeText(selectedText, tab.id);
  }
});

// Metni seslendirme fonksiyonu
function speakText(text) {
  if (!text) return;

  // Önce devam eden konuşmayı durdur
  chrome.tts.stop();

  // Ayarları al ve metni seslendir
  chrome.storage.sync.get(['language', 'voiceRate', 'voicePitch'], (result) => {
    const language = result.language || 'tr-TR';
    const rate = result.voiceRate || 1.0;
    const pitch = result.voicePitch || 1.0;

    chrome.tts.speak(text, {
      lang: language,
      rate: rate,
      pitch: pitch,
      onEvent: (event) => {
        if (event.type === 'error') {
          console.error('TTS Hatası:', event);
          // Kullanıcıya bildirim göster
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Seslendirme Hatası',
            message: 'Metin seslendirilemedi. Lütfen dil ayarlarını kontrol edin.'
          });
        } else if (event.type === 'end') {
          console.log('Seslendirme tamamlandı');
        }
      }
    });
  });
}

// Metni özetleme (n8n'e gönderme) fonksiyonu
async function summarizeText(text, tabId) {
  if (!text) return;

  try {
    // n8n webhook URL'ini al
    const result = await chrome.storage.sync.get(['n8nWebhook']);
    const webhookUrl = result.n8nWebhook;

    if (!webhookUrl) {
      // Webhook URL yoksa kullanıcıyı uyar
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Webhook URL Bulunamadı',
        message: 'Lütfen eklenti ayarlarından n8n webhook URL\'sini girin.'
      });
      return;
    }

    // Bildirim göster
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Metin Gönderiliyor',
      message: 'Seçili metin n8n\'e gönderiliyor...'
    });

    // n8n'e POST isteği gönder
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        timestamp: new Date().toISOString(),
        source: 'chrome-extension'
      })
    });

    if (response.ok) {
      const data = await response.json();
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Başarılı',
        message: 'Metin n8n\'e başarıyla gönderildi!'
      });
      console.log('n8n yanıtı:', data);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('n8n hatası:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Hata',
      message: `n8n\'e gönderim başarısız: ${error.message}`
    });
  }
}

// Popup'tan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'speakText') {
    speakText(request.text);
    sendResponse({ success: true });
  } else if (request.action === 'stopSpeaking') {
    chrome.tts.stop();
    sendResponse({ success: true });
  }
  return true;
});
