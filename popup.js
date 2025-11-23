// DOM elementleri
const languageSelect = document.getElementById('language');
const voiceRateInput = document.getElementById('voiceRate');
const voicePitchInput = document.getElementById('voicePitch');
const rateValueSpan = document.getElementById('rateValue');
const pitchValueSpan = document.getElementById('pitchValue');
const n8nWebhookInput = document.getElementById('n8nWebhook');
const testTextArea = document.getElementById('testText');
const testSpeakBtn = document.getElementById('testSpeakBtn');
const stopSpeakBtn = document.getElementById('stopSpeakBtn');
const testWebhookBtn = document.getElementById('testWebhookBtn');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Sayfa yüklendiğinde ayarları yükle
document.addEventListener('DOMContentLoaded', loadSettings);

// Range input değerlerini göster
voiceRateInput.addEventListener('input', () => {
  rateValueSpan.textContent = voiceRateInput.value;
});

voicePitchInput.addEventListener('input', () => {
  pitchValueSpan.textContent = voicePitchInput.value;
});

// Ayarları kaydet butonu
saveBtn.addEventListener('click', saveSettings);

// Test seslendir butonu
testSpeakBtn.addEventListener('click', testSpeak);

// Seslendirmeyi durdur butonu
stopSpeakBtn.addEventListener('click', stopSpeaking);

// Webhook test butonu
testWebhookBtn.addEventListener('click', testWebhook);

// Ayarları yükle
function loadSettings() {
  chrome.storage.sync.get(
    ['language', 'voiceRate', 'voicePitch', 'n8nWebhook'],
    (result) => {
      if (result.language) {
        languageSelect.value = result.language;
      }
      if (result.voiceRate) {
        voiceRateInput.value = result.voiceRate;
        rateValueSpan.textContent = result.voiceRate;
      }
      if (result.voicePitch) {
        voicePitchInput.value = result.voicePitch;
        pitchValueSpan.textContent = result.voicePitch;
      }
      if (result.n8nWebhook) {
        n8nWebhookInput.value = result.n8nWebhook;
      }
    }
  );
}

// Ayarları kaydet
function saveSettings() {
  const settings = {
    language: languageSelect.value,
    voiceRate: parseFloat(voiceRateInput.value),
    voicePitch: parseFloat(voicePitchInput.value),
    n8nWebhook: n8nWebhookInput.value.trim()
  };

  chrome.storage.sync.set(settings, () => {
    showStatus('Ayarlar başarıyla kaydedildi! ✓', 'success');
  });
}

// Test seslendirme
function testSpeak() {
  const text = testTextArea.value.trim();
  if (!text) {
    showStatus('Lütfen bir test metni girin!', 'error');
    return;
  }

  chrome.runtime.sendMessage(
    { action: 'speakText', text: text },
    (response) => {
      if (response && response.success) {
        showStatus('Metin seslendiriliyor... 🔊', 'success');
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

// Webhook testi
async function testWebhook() {
  const webhookUrl = n8nWebhookInput.value.trim();
  const text = testTextArea.value.trim();

  if (!webhookUrl) {
    showStatus('Lütfen webhook URL\'sini girin!', 'error');
    return;
  }

  if (!text) {
    showStatus('Lütfen bir test metni girin!', 'error');
    return;
  }

  try {
    showStatus('Webhook\'a gönderiliyor...', 'success');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        timestamp: new Date().toISOString(),
        source: 'chrome-extension-test'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Webhook yanıtı:', data);
      showStatus('Webhook testi başarılı! ✓', 'success');
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
