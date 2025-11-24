// DOM elementleri
const targetLanguageSelect = document.getElementById('targetLanguage');
const playbackRateSelect = document.getElementById('playbackRate');
const n8nWebhookInput = document.getElementById('n8nWebhook');
const testTextArea = document.getElementById('testText');
const testSpeakBtn = document.getElementById('testSpeakBtn');
const testSummarizeBtn = document.getElementById('testSummarizeBtn');
const stopSpeakBtn = document.getElementById('stopSpeakBtn');
const testWebhookBtn = document.getElementById('testWebhookBtn');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Sayfa yüklendiğinde ayarları yükle
document.addEventListener('DOMContentLoaded', loadSettings);

// Ayarları kaydet butonu
saveBtn.addEventListener('click', saveSettings);

// Test seslendir butonu
testSpeakBtn.addEventListener('click', testSpeak);

// Test özetleme butonu
testSummarizeBtn.addEventListener('click', testSummarize);

// Seslendirmeyi durdur butonu
stopSpeakBtn.addEventListener('click', stopSpeaking);

// Webhook test butonu
testWebhookBtn.addEventListener('click', testWebhook);

// Ses hızı değiştiğinde otomatik kaydet
playbackRateSelect.addEventListener('change', () => {
  const playbackRate = parseFloat(playbackRateSelect.value);
  chrome.storage.sync.set({ playbackRate }, () => {
    showStatus(`Ses hızı ${playbackRate}x olarak ayarlandı ✓`, 'success');
  });
});

// Ayarları yükle
function loadSettings() {
  chrome.storage.sync.get(
    ['targetLanguage', 'n8nWebhook', 'playbackRate'],
    (result) => {
      if (result.targetLanguage) {
        targetLanguageSelect.value = result.targetLanguage;
      }
      if (result.n8nWebhook) {
        n8nWebhookInput.value = result.n8nWebhook;
      }
      if (result.playbackRate) {
        playbackRateSelect.value = result.playbackRate;
      }
    }
  );
}

// Ayarları kaydet
function saveSettings() {
  const settings = {
    targetLanguage: targetLanguageSelect.value,
    playbackRate: parseFloat(playbackRateSelect.value),
    n8nWebhook: n8nWebhookInput.value.trim()
  };

  chrome.storage.sync.set(settings, () => {
    showStatus('Ayarlar başarıyla kaydedildi! ✓', 'success');
  });
}

// Test seslendirme
async function testSpeak() {
  const text = testTextArea.value.trim();
  const targetLanguage = targetLanguageSelect.value;

  if (!text) {
    showStatus('Lütfen bir test metni girin!', 'error');
    return;
  }

  showStatus('Metin seslendiriliyor... 🔊', 'success');

  chrome.runtime.sendMessage(
    {
      action: 'speakText',
      text: text,
      targetLanguage: targetLanguage
    },
    (response) => {
      if (response && response.success) {
        showStatus('Seslendirme başarılı! ✓', 'success');
      } else if (response && response.error) {
        showStatus(`Hata: ${response.error}`, 'error');
      }
    }
  );
}

// Seslendirmeyi durdur
function stopSpeaking() {
  chrome.runtime.sendMessage({ action: 'stopSpeaking' }, (response) => {
    if (response && response.success) {
      showStatus('Seslendirme durduruldu ⏹', 'success');
    }
  });
}

// Test özetleme
async function testSummarize() {
  const text = testTextArea.value.trim();
  const targetLanguage = targetLanguageSelect.value;

  if (!text) {
    showStatus('Lütfen bir test metni girin!', 'error');
    return;
  }

  showStatus('Metin özetleniyor ve seslendiriliyor... 📝', 'success');

  chrome.runtime.sendMessage(
    {
      action: 'summarizeText',
      text: text,
      targetLanguage: targetLanguage
    },
    (response) => {
      if (response && response.success) {
        showStatus('Özetleme başarılı! ✓', 'success');
      } else if (response && response.error) {
        showStatus(`Hata: ${response.error}`, 'error');
      }
    }
  );
}

// Webhook testi
async function testWebhook() {
  const webhookUrl = n8nWebhookInput.value.trim();
  const text = testTextArea.value.trim();
  const targetLanguage = targetLanguageSelect.value;

  if (!webhookUrl) {
    showStatus('Lütfen webhook URL\'sini girin!', 'error');
    return;
  }

  if (!text) {
    showStatus('Lütfen bir test metni girin!', 'error');
    return;
  }

  try {
    showStatus('Webhook\'a özetleme isteği gönderiliyor...', 'success');

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
        source: 'chrome-extension-test'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Webhook yanıtı:', data);
      if (data.summary) {
        showStatus(`✓ Özet: ${data.summary.substring(0, 100)}...`, 'success');
      } else {
        showStatus('Webhook testi başarılı! ✓', 'success');
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Webhook hatası:', error);
    showStatus(`Webhook hatası: ${error.message}`, 'error');
  }
}

// Durum mesajı göster
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // 3 saniye sonra gizle
  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 3000);
}

// Enter tuşu ile kaydet
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    saveSettings();
  }
});
