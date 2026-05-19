from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 500
NAVY = (11, 29, 53)
NAVY2 = (19, 49, 92)
GREEN = (0, 214, 143)
WHITE = (255, 255, 255)
MUTED = (180, 200, 220)

img = Image.new("RGB", (W, H), NAVY)
d = ImageDraw.Draw(img)

# diagonal gradient overlay
for i in range(H):
    t = i / H
    r = int(NAVY[0] * (1 - t) + NAVY2[0] * t)
    g = int(NAVY[1] * (1 - t) + NAVY2[1] * t)
    b = int(NAVY[2] * (1 - t) + NAVY2[2] * t)
    d.line([(0, i), (W, i)], fill=(r, g, b))

# decorative green accent circle (right side)
d.ellipse([W - 360, -180, W + 200, 380], fill=(15, 40, 70))
d.ellipse([W - 280, -100, W + 120, 300], fill=(20, 55, 95))

# green badge / logo box (left)
badge_x, badge_y, badge_s = 70, 110, 130
d.rounded_rectangle([badge_x, badge_y, badge_x + badge_s, badge_y + badge_s], radius=28, fill=GREEN)

# checkmark inside badge
cx, cy = badge_x, badge_y
d.line([(cx + 32, cy + 70), (cx + 58, cy + 95), (cx + 100, cy + 42)], fill=WHITE, width=12, joint="curve")

# fonts
def load_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

f_brand = load_font(82, bold=True)
f_tag = load_font(30, bold=True)
f_sub = load_font(22)
f_url = load_font(20, bold=True)

# Brand "X" mark beside title in green
title_x = 240
title_y = 130
d.text((title_x, title_y), "X", font=f_brand, fill=GREEN)
xw = d.textbbox((title_x, title_y), "X", font=f_brand)[2] - title_x
d.text((title_x + xw + 14, title_y), "Vistoria", font=f_brand, fill=WHITE)

# green underline bar
d.rectangle([title_x, title_y + 100, title_x + 320, title_y + 108], fill=GREEN)

# tagline
d.text((title_x, title_y + 130), "Vistoria condominial em tempo real", font=f_tag, fill=WHITE)
d.text((title_x, title_y + 175), "Checklists  •  Fotos geolocalizadas  •  Relatórios em PDF", font=f_sub, fill=MUTED)

# bottom url
d.text((title_x, H - 60), "xvistoria.com.br", font=f_url, fill=GREEN)

out = r"C:\Users\HP\OneDrive\Área de Trabalho\xvistoria-banner-1024x500.png"
img.save(out, "PNG", optimize=True)
print(out)
