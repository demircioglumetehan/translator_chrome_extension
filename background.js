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
  chrome.storage.sync.get(['targetLanguage', 'n8nWebhook', 'playbackRate'], (result) => {
    const defaults = {};
    if (!result.targetLanguage) {
      defaults.targetLanguage = 'Turkish';
    }
    if (!result.playbackRate) {
      defaults.playbackRate = 1.0;
    }
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
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
    const result = await chrome.storage.sync.get(['n8nWebhook', 'targetLanguage', 'playbackRate']);
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

    // Playback rate'i al
    const playbackRate = result.playbackRate || 1.0;

    // Active tab'a audio gönder (Service Worker'da Audio çalışmaz)
    console.log('Sending audio to active tab...');
    await sendAudioToActiveTab(data.audioBase64, data.mimeType || 'audio/mpeg', playbackRate);

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
async function sendAudioToActiveTab(base64Data, mimeType = 'audio/mpeg', playbackRate = 1.0) {
  try {
    console.log('=== sendAudioToActiveTab Debug ===');
    console.log('Audio base64 length:', base64Data?.length);
    console.log('MIME type:', mimeType);
    console.log('Playback rate:', playbackRate);

    // Active tab'ı al
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('Active tab bulunamadı');
    }

    console.log('Sending to tab:', tab.id, tab.url);

    // Chrome internal sayfalarında content script çalışmaz
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      throw new Error('Chrome internal sayfalarında ses oynatılamaz. Normal bir web sayfasına gidin.');
    }

    try {
      // Content script'e mesaj gönder
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'playAudio',
        audioBase64: base64Data,
        mimeType: mimeType,
        playbackRate: playbackRate
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
          mimeType: mimeType,
          playbackRate: playbackRate
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
    const result = await chrome.storage.sync.get(['n8nWebhook', 'targetLanguage', 'playbackRate']);
    const webhookUrl = result.n8nWebhook;
    const targetLanguage = result.targetLanguage || 'Turkish';
    const playbackRate = result.playbackRate || 1.0;

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
    console.log('audioBase64 exists:', !!data.audioBase64);
    console.log('audioBase64 length:', data.audioBase64?.length || 0);

    if (!data.success || !data.audioBase64) {
      throw new Error('Özet sesi alınamadı');
    }

    // Audio'yu seslendir
    console.log('Playing summary audio...');
    await sendAudioToActiveTab(data.audioBase64, data.mimeType || 'audio/mpeg', playbackRate);
    showNotification('Özet Hazır!', 'Özet seslendiriliyor...', 'success');

  } catch (error) {
    console.error('Özetleme hatası:', error);
    showNotification('Özetleme Hatası', `Hata: ${error.message}`, 'error');
  }
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
  } else if (request.action === 'summarizeText') {
    // Active tab id'yi al
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => {
        return summarizeText(request.text, tab.id);
      })
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
