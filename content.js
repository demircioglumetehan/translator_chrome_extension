// Content script - Sayfa içi özet gösterimi ve audio oynatma

console.log('Metin Seslendirici eklentisi yüklendi');

// Özet popup elementini tut
let summaryPopup = null;

// Audio oynatma için global değişken
let currentAudio = null;

// Background script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSummary') {
    showSummaryPopup(request.summary, request.stats);
    sendResponse({ success: true });
  } else if (request.action === 'playAudio') {
    // Audio oynat
    playAudioFromBase64(request.audioBase64, request.mimeType)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Async response için
  } else if (request.action === 'stopAudio') {
    stopCurrentAudio();
    sendResponse({ success: true });
  }
  return true;
});

// Sayfa içinde özet popup göster
function showSummaryPopup(summary, stats) {
  // Eski popup varsa kaldır
  if (summaryPopup) {
    summaryPopup.remove();
  }

  // Popup container oluştur
  summaryPopup = document.createElement('div');
  summaryPopup.id = 'chrome-ext-summary-popup';
  summaryPopup.innerHTML = `
    <div class="summary-header">
      <h3>📝 Özet</h3>
      <button class="summary-close">✕</button>
    </div>
    <div class="summary-content">
      <p>${escapeHtml(summary)}</p>
    </div>
    <div class="summary-stats">
      <span>📊 Orijinal: ${stats.originalLength} karakter</span>
      <span>📊 Özet: ${stats.summaryLength} karakter</span>
      <span>📊 Sıkıştırma: ${stats.compressionRatio}</span>
    </div>
    <div class="summary-actions">
      <button class="summary-copy">📋 Kopyala</button>
      <button class="summary-speak">🔊 Seslendir</button>
    </div>
  `;

  // Stilleri ekle
  addSummaryStyles();

  // Popup'ı sayfaya ekle
  document.body.appendChild(summaryPopup);

  // Event listener'ları ekle
  const closeBtn = summaryPopup.querySelector('.summary-close');
  const copyBtn = summaryPopup.querySelector('.summary-copy');
  const speakBtn = summaryPopup.querySelector('.summary-speak');

  closeBtn.addEventListener('click', () => closeSummaryPopup());
  copyBtn.addEventListener('click', () => copySummary(summary));
  speakBtn.addEventListener('click', () => speakSummary(summary));

  // 15 saniye sonra otomatik kapat
  setTimeout(() => {
    if (summaryPopup) {
      closeSummaryPopup();
    }
  }, 15000);
}

// Popup'ı kapat
function closeSummaryPopup() {
  if (summaryPopup) {
    summaryPopup.classList.add('summary-fade-out');
    setTimeout(() => {
      if (summaryPopup) {
        summaryPopup.remove();
        summaryPopup = null;
      }
    }, 300);
  }
}

// Özeti kopyala
function copySummary(summary) {
  navigator.clipboard.writeText(summary).then(() => {
    const copyBtn = summaryPopup.querySelector('.summary-copy');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Kopyalandı!';
    copyBtn.style.backgroundColor = '#10b981';
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.backgroundColor = '';
    }, 2000);
  }).catch(err => {
    console.error('Kopyalama hatası:', err);
  });
}

// Özeti seslendir
function speakSummary(summary) {
  chrome.runtime.sendMessage({
    action: 'speakText',
    text: summary
  });
}

// Audio oynatma fonksiyonu (Content Script'te çalışır)
async function playAudioFromBase64(base64Data, mimeType = 'audio/mpeg') {
  return new Promise((resolve, reject) => {
    try {
      console.log('Content Script: Playing audio, base64 length:', base64Data?.length);

      // Önce aktif sesi durdur
      stopCurrentAudio();

      if (!base64Data || base64Data.length === 0) {
        reject(new Error('Base64 data boş'));
        return;
      }

      // Data URL oluştur
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      // Audio element oluştur
      currentAudio = new Audio(dataUrl);

      currentAudio.onloadedmetadata = () => {
        console.log('Content Script: Audio metadata loaded, duration:', currentAudio.duration);
      };

      currentAudio.onplay = () => {
        console.log('Content Script: Audio started playing');
      };

      currentAudio.onended = () => {
        console.log('Content Script: Audio playback ended');
        currentAudio = null;
        resolve();
      };

      currentAudio.onerror = (e) => {
        console.error('Content Script: Audio playback error:', e);
        console.error('Error details:', currentAudio.error);
        currentAudio = null;
        reject(new Error('Ses dosyası oynatılamadı'));
      };

      // Oynat
      currentAudio.play()
        .then(() => {
          console.log('Content Script: play() resolved');
        })
        .catch((err) => {
          console.error('Content Script: play() rejected:', err);
          reject(err);
        });

    } catch (error) {
      console.error('Content Script: playAudioFromBase64 exception:', error);
      reject(error);
    }
  });
}

// Aktif sesi durdur
function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    console.log('Content Script: Audio stopped');
  }
}

// HTML escape
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Popup stilleri
function addSummaryStyles() {
  // Eğer stil zaten eklendiyse tekrar ekleme
  if (document.getElementById('chrome-ext-summary-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'chrome-ext-summary-styles';
  style.textContent = `
    #chrome-ext-summary-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-width: 90vw;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    #chrome-ext-summary-popup.summary-fade-out {
      animation: fadeOut 0.3s ease-out forwards;
    }

    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    #chrome-ext-summary-popup .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    #chrome-ext-summary-popup .summary-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    #chrome-ext-summary-popup .summary-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    #chrome-ext-summary-popup .summary-close:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    #chrome-ext-summary-popup .summary-content {
      padding: 20px;
      max-height: 300px;
      overflow-y: auto;
    }

    #chrome-ext-summary-popup .summary-content p {
      margin: 0;
      line-height: 1.6;
      color: #374151;
      font-size: 14px;
    }

    #chrome-ext-summary-popup .summary-stats {
      display: flex;
      gap: 12px;
      padding: 12px 20px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      flex-wrap: wrap;
    }

    #chrome-ext-summary-popup .summary-stats span {
      white-space: nowrap;
    }

    #chrome-ext-summary-popup .summary-actions {
      display: flex;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
    }

    #chrome-ext-summary-popup .summary-actions button {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    #chrome-ext-summary-popup .summary-copy {
      background: #3b82f6;
      color: white;
    }

    #chrome-ext-summary-popup .summary-copy:hover {
      background: #2563eb;
    }

    #chrome-ext-summary-popup .summary-speak {
      background: #8b5cf6;
      color: white;
    }

    #chrome-ext-summary-popup .summary-speak:hover {
      background: #7c3aed;
    }

    /* Scrollbar styling */
    #chrome-ext-summary-popup .summary-content::-webkit-scrollbar {
      width: 6px;
    }

    #chrome-ext-summary-popup .summary-content::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 3px;
    }

    #chrome-ext-summary-popup .summary-content::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    #chrome-ext-summary-popup .summary-content::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  `;

  document.head.appendChild(style);
}
