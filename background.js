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
  chrome.storage.sync.get(['targetLanguage', 'n8nWebhook'], (result) => {
    if (!result.targetLanguage) {
      chrome.storage.sync.set({ targetLanguage: 'Turkish' });
    }
  });
});

// Aktif ses oynatma için global değişken
let currentAudio = null;

// Context menu tıklamalarını dinle
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;

  if (info.menuItemId === 'speakText') {
    // Metni n8n ile seslendir
    speakText(selectedText);
  } else if (info.menuItemId === 'summarizeText') {
    // Metni n8n ile özetle
    summarizeText(selectedText, tab.id);
  }
});

// Metni seslendirme fonksiyonu (n8n + OpenAI TTS)
async function speakText(text) {
  if (!text) return;

  try {
    // Önce aktif sesi durdur
    stopCurrentAudio();

    // Ayarları al
    const result = await chrome.storage.sync.get(['n8nWebhook', 'targetLanguage']);
    const webhookUrl = result.n8nWebhook;
    const targetLanguage = result.targetLanguage || 'Turkish';

    if (!webhookUrl) {
      showNotification('Webhook URL Bulunamadı', 'Lütfen eklenti ayarlarından n8n webhook URL\'sini girin.', 'error');
      return;
    }

    // Yükleniyor bildirimi
    showNotification('Seslendiriliyor...', 'Metin çevriliyor ve seslendiriliyor...', 'info');

    // n8n'e POST isteği gönder
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        targetLanguage: targetLanguage,
        action: 'speak',
        timestamp: new Date().toISOString(),
        source: 'chrome-extension'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // DEBUG: n8n'den gelen veriyi logla
    console.log('=== n8n Response Debug ===');
    console.log('Full response:', data);
    console.log('success:', data.success);
    console.log('audioBase64 exists:', !!data.audioBase64);
    console.log('audioBase64 length:', data.audioBase64?.length || 0);
    console.log('mimeType:', data.mimeType);
    console.log('translatedText:', data.translatedText);
    console.log('First 100 chars of base64:', data.audioBase64?.substring(0, 100));
    console.log('========================');

    if (!data.success || !data.audioBase64) {
      console.error('Validation failed:', { success: data.success, hasAudio: !!data.audioBase64 });
      throw new Error('Ses verisi alınamadı - Response: ' + JSON.stringify(data).substring(0, 200));
    }

    // Base64 ses verisini çal
    console.log('Attempting to play audio...');
    playAudioFromBase64(data.audioBase64, data.mimeType || 'audio/mpeg');

    showNotification(
      'Seslendirme Başarılı!',
      data.translatedText ? `Çevrilen metin: ${data.translatedText.substring(0, 100)}...` : 'Metin seslendiriliyor...',
      'success'
    );

  } catch (error) {
    console.error('Seslendirme hatası:', error);
    showNotification('Seslendirme Hatası', `Hata: ${error.message}`, 'error');
  }
}

// Base64 ses verisini oynat (Service Worker uyumlu - Data URL kullanır)
function playAudioFromBase64(base64Data, mimeType = 'audio/mpeg') {
  try {
    console.log('=== playAudioFromBase64 Debug ===');
    console.log('Input base64 length:', base64Data?.length);
    console.log('MIME type:', mimeType);

    // Önce aktif sesi durdur
    stopCurrentAudio();

    // Base64 validation
    if (!base64Data || base64Data.length === 0) {
      throw new Error('Base64 data boş');
    }

    // Service Worker'da URL.createObjectURL çalışmaz
    // Data URL kullanmalıyız
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    console.log('Data URL created, length:', dataUrl.length);

    // Audio element oluştur ve oynat
    currentAudio = new Audio(dataUrl);

    currentAudio.onloadedmetadata = () => {
      console.log('Audio metadata loaded, duration:', currentAudio.duration);
    };

    currentAudio.oncanplaythrough = () => {
      console.log('Audio can play through');
    };

    currentAudio.onplay = () => {
      console.log('Audio started playing');
    };

    currentAudio.onended = () => {
      console.log('Audio playback ended');
      currentAudio = null;
    };

    currentAudio.onerror = (e) => {
      console.error('Audio playback error:', e);
      console.error('Error details:', currentAudio.error);
      currentAudio = null;
      showNotification('Ses Oynatma Hatası', 'Ses dosyası oynatılamadı.', 'error');
    };

    console.log('Calling play()...');
    currentAudio.play()
      .then(() => {
        console.log('play() promise resolved successfully');
      })
      .catch((err) => {
        console.error('play() promise rejected:', err);
        showNotification('Ses Oynatma Hatası', `Oynatma başarısız: ${err.message}`, 'error');
      });

  } catch (error) {
    console.error('playAudioFromBase64 exception:', error);
    console.error('Error stack:', error.stack);
    showNotification('Ses Oynatma Hatası', `Hata: ${error.message}`, 'error');
  }
}

// Aktif sesi durdur
function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// Metni özetleme (n8n + ChatGPT) fonksiyonu
async function summarizeText(text, tabId) {
  if (!text) return;

  try {
    // Ayarları al
    const result = await chrome.storage.sync.get(['n8nWebhook', 'targetLanguage']);
    const webhookUrl = result.n8nWebhook;
    const targetLanguage = result.targetLanguage || 'Turkish';

    if (!webhookUrl) {
      showNotification('Webhook URL Bulunamadı', 'Lütfen eklenti ayarlarından n8n webhook URL\'sini girin.', 'error');
      return;
    }

    // Yükleniyor bildirimi
    showNotification('Özetleniyor...', 'Metin özetleniyor...', 'info');

    // n8n'e POST isteği gönder
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        targetLanguage: targetLanguage,
        action: 'summarize',
        timestamp: new Date().toISOString(),
        source: 'chrome-extension'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.summary) {
      throw new Error('Özet alınamadı');
    }

    // Özeti göster
    showSummaryNotification(data);

    // Content script'e özeti gönder (gelecekte sayfa içinde gösterim için)
    chrome.tabs.sendMessage(tabId, {
      action: 'showSummary',
      summary: data.summary,
      stats: {
        originalLength: data.originalLength,
        summaryLength: data.summaryLength,
        compressionRatio: data.compressionRatio
      }
    }).catch(() => {
      // Content script hazır değilse hata verme
    });

  } catch (error) {
    console.error('Özetleme hatası:', error);
    showNotification('Özetleme Hatası', `Hata: ${error.message}`, 'error');
  }
}

// Özet bildirimi göster
function showSummaryNotification(data) {
  const message = data.summary.length > 200
    ? data.summary.substring(0, 200) + '...'
    : data.summary;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Özet Hazır!',
    message: message,
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: 'Kopyala' }
    ]
  });

  // Bildirim butonlarını dinle
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
      // Kopyala butonu
      copyToClipboard(data.summary);
      showNotification('Kopyalandı!', 'Özet panoya kopyalandı.', 'success');
    }
  });
}

// Panoya kopyala
function copyToClipboard(text) {
  // Chrome'da offscreen document veya tab kullanarak kopyalama
  navigator.clipboard.writeText(text).catch(() => {
    console.error('Panoya kopyalama başarısız');
  });
}

// Bildirim göster
function showNotification(title, message, type = 'info') {
  const icons = {
    success: 'icons/icon48.png',
    error: 'icons/icon48.png',
    info: 'icons/icon48.png'
  };

  chrome.notifications.create({
    type: 'basic',
    iconUrl: icons[type] || icons.info,
    title: title,
    message: message
  });
}

// Popup'tan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'speakText') {
    speakText(request.text)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Async response için
  } else if (request.action === 'stopSpeaking') {
    stopCurrentAudio();
    sendResponse({ success: true });
  }
  return true;
});
