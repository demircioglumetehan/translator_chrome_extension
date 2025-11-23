#!/usr/bin/env python3
"""
Basit PNG ikonları oluştur.
PIL/Pillow gerektirir: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw

    def create_icon(size):
        # Gradient background renkleri
        img = Image.new('RGBA', (size, size), (102, 126, 234, 255))
        draw = ImageDraw.Draw(img)

        # Beyaz daire (ses simgesi)
        center = size // 2
        radius = int(size * 0.35)
        draw.ellipse(
            [center - radius, center - radius, center + radius, center + radius],
            fill=(255, 255, 255, 255)
        )

        # Ses dalgaları (basit çizgiler)
        wave_color = (118, 75, 162, 255)
        line_width = max(2, size // 32)

        # Küçük dalga
        x1 = center + radius + size // 20
        draw.arc(
            [x1 - radius//2, center - radius//2, x1 + radius//2, center + radius//2],
            start=270, end=90, fill=wave_color, width=line_width
        )

        # Orta dalga
        x2 = x1 + size // 10
        draw.arc(
            [x2 - radius, center - radius, x2 + radius, center + radius],
            start=270, end=90, fill=wave_color, width=line_width
        )

        return img

    # 16x16, 48x48, 128x128 ikonları oluştur
    for size in [16, 48, 128]:
        img = create_icon(size)
        img.save(f'icons/icon{size}.png', 'PNG')
        print(f'✓ icon{size}.png oluşturuldu')

    print('\nTüm ikonlar başarıyla oluşturuldu!')

except ImportError:
    print('HATA: Pillow kütüphanesi bulunamadı.')
    print('Lütfen şu komutu çalıştırın: pip install Pillow')
    print('\nAlternatif: SVG dosyasını online bir araçla PNG\'ye çevirebilirsiniz:')
    print('- https://cloudconvert.com/svg-to-png')
    print('- https://svgtopng.com/')
    exit(1)
