#!/bin/bash

# n8n Webhook Test Script
# Usage: ./test-n8n-webhook.sh YOUR_WEBHOOK_URL

WEBHOOK_URL="${1:-https://your-n8n.com/webhook/chrome-tts-extension}"

echo "🧪 Testing n8n webhook: $WEBHOOK_URL"
echo ""

# Test isteği gönder
echo "📤 Sending test request..."
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "targetLanguage": "Turkish",
    "action": "speak",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "source": "test-script"
  }')

echo "📥 Response received:"
echo ""

# Response'u parse et
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // "false"')
HAS_AUDIO=$(echo "$RESPONSE" | jq -r 'if .audioBase64 then "true" else "false" end')
AUDIO_LENGTH=$(echo "$RESPONSE" | jq -r '.audioBase64 | length // 0')
MIME_TYPE=$(echo "$RESPONSE" | jq -r '.mimeType // "unknown"')
TRANSLATED=$(echo "$RESPONSE" | jq -r '.translatedText // "N/A"')

echo "✅ Success: $SUCCESS"
echo "🔊 Audio exists: $HAS_AUDIO"
echo "📏 Audio base64 length: $AUDIO_LENGTH"
echo "🎵 MIME type: $MIME_TYPE"
echo "🌍 Translated text: $TRANSLATED"
echo ""

# Full response (first 500 chars)
echo "📄 Full response (first 500 chars):"
echo "$RESPONSE" | jq '.' | head -c 500
echo ""
echo "..."
echo ""

# Validasyon
if [ "$SUCCESS" = "true" ] && [ "$HAS_AUDIO" = "true" ] && [ "$AUDIO_LENGTH" -gt 1000 ]; then
  echo "✅ Webhook testi BAŞARILI!"
  echo "Audio verisi doğru formatta görünüyor."
  exit 0
else
  echo "❌ Webhook testi BAŞARISIZ!"
  echo ""
  echo "Sorunlar:"
  [ "$SUCCESS" != "true" ] && echo "  - success field false veya yok"
  [ "$HAS_AUDIO" != "true" ] && echo "  - audioBase64 field yok"
  [ "$AUDIO_LENGTH" -lt 1000 ] && echo "  - audioBase64 çok kısa (muhtemelen boş)"
  exit 1
fi
