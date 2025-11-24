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
  chrome.storage.sync.get(['targetLanguage', 'n8nWebhook', 'playbackSpeed'], (result) => {
    if (!result.targetLanguage) {
      chrome.storage.sync.set({ targetLanguage: 'Turkish' });
    }
    if (!result.playbackSpeed) {
      chrome.storage.sync.set({ playbackSpeed: 1.0 });
    }
  });
});

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
    const result = await chrome.storage.sync.get(['n8nWebhook', 'targetLanguage', 'playbackSpeed']);
    const webhookUrl = result.n8nWebhook;
    const targetLanguage = result.targetLanguage || 'Turkish';
    const playbackSpeed = result.playbackSpeed || 1.0;

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
        speed: playbackSpeed,
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

    // Active tab'a audio gönder (Service Worker'da Audio çalışmaz)
    console.log('Sending audio to active tab...');
    await sendAudioToActiveTab(data.audioBase64, data.mimeType || 'audio/mpeg');

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

// Active tab'a audio gönder (Content script'te oynatılacak)
async function sendAudioToActiveTab(base64Data, mimeType = 'audio/mpeg') {
  try {
    console.log('=== sendAudioToActiveTab Debug ===');
    console.log('Audio base64 length:', base64Data?.length);
    console.log('MIME type:', mimeType);

    // Active tab'ı al
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('Active tab bulunamadı');
    }

    console.log('Sending to tab:', tab.id, tab.url);

    // Chrome internal sayfalarında content script çalışmaz
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Chrome internal sayfalarında ses oynatılamaz. Normal bir web sayfasına gidin.');
    }

    try {
      // Content script'e mesaj gönder
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'playAudio',
        audioBase64: base64Data,
        mimeType: mimeType
      });

      if (response && response.success) {
        console.log('Audio sent successfully to content script');
        return;
      } else {
        throw new Error(response?.error || 'Content script yanıt vermedi');
      }
    } catch (msgError) {
      // Eğer content script yüklü değilse, programmatically inject et
      if (msgError.message.includes('Could not establish connection') ||
          msgError.message.includes('Receiving end does not exist')) {

        console.log('Content script not found, injecting...');

        // Content script'i inject et
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        console.log('Content script injected, waiting 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));

        // Tekrar mesaj gönder
        const retryResponse = await chrome.tabs.sendMessage(tab.id, {
          action: 'playAudio',
          audioBase64: base64Data,
          mimeType: mimeType
        });

        if (retryResponse && retryResponse.success) {
          console.log('Audio sent successfully after injection');
        } else {
          throw new Error(retryResponse?.error || 'Content script yanıt vermedi (retry)');
        }
      } else {
        throw msgError;
      }
    }

  } catch (error) {
    console.error('sendAudioToActiveTab error:', error);
    showNotification(
      'Ses Oynatma Hatası',
      error.message || 'Ses oynatılamadı. Normal bir web sayfasında deneyin.',
      'error'
    );
    throw error;
  }
}

// Aktif sesi durdur (Active tab'da)
async function stopCurrentAudio() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, { action: 'stopAudio' });
    }
  } catch (error) {
    // Sessizce başarısız ol
    console.log('Could not stop audio:', error);
  }
}

// Metni özetleme (n8n + ChatGPT + TTS) fonksiyonu
async function summarizeText(text, tabId) {
  if (!text) return;

  try {
    // Ayarları al
    const result = await chrome.storage.sync.get(['n8nWebhook', 'targetLanguage', 'playbackSpeed']);
    const webhookUrl = result.n8nWebhook;
    const targetLanguage = result.targetLanguage || 'Turkish';
    const playbackSpeed = result.playbackSpeed || 1.0;

    if (!webhookUrl) {
      showNotification('Webhook URL Bulunamadı', 'Lütfen eklenti ayarlarından n8n webhook URL\'sini girin.', 'error');
      return;
    }

    // Yükleniyor bildirimi
    showNotification('Özetleniyor...', 'Metin özetleniyor ve seslendiriliyor...', 'info');

    // n8n'e POST isteği gönder
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        targetLanguage: targetLanguage,
        speed: playbackSpeed,
        action: 'summarize',
        timestamp: new Date().toISOString(),
        source: 'chrome-extension'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('=== Özet Response Debug ===');
    console.log('Full response:', data);
    console.log('success:', data.success);
    console.log('summary:', data.summary);
    console.log('audioBase64 exists:', !!data.audioBase64);
    console.log('audioBase64 length:', data.audioBase64?.length || 0);

    if (!data.success || !data.summary) {
      throw new Error('Özet alınamadı');
    }

    // Content script'e özeti gönder (sayfa içinde gösterim)
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
      console.log('Could not send summary to content script');
    });

    // Eğer audio varsa, seslendir
    if (data.audioBase64) {
      console.log('Playing summary audio...');
      await sendAudioToActiveTab(data.audioBase64, data.mimeType || 'audio/mpeg');
      showNotification('Özet Hazır!', 'Özet seslendiriliyor...', 'success');
    } else {
      // Audio yoksa sadece özeti göster
      showSummaryNotification(data);
    }

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
    stopCurrentAudio()
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: true })); // Hata olsa bile success dön
    return true; // Async response için
  }
  return true;
});
