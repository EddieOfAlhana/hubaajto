"""Put the Hungarian ad copy on a generated, text-free 4:5 creative.

The image generators render Hungarian accents unreliably, so the creatives are generated without
text and the headline / product block is drawn here with Inter (the site's UI font).

Usage, from the repo root:
    python3 -I src/scripts/overlay_ad_copy.py src/scripts/ad-copy/keszpenz.json

Config keys (see src/scripts/ad-copy/*.json): src, out, shade (soft dark rectangles behind the
text: [x0, y0, x1, y1, strength]), headline (lines, size, leading, x, y), product (lines of
[text, size, weight, gap]), logo (rectangle placeholder, optional). Coordinates are in the
1080 x 1350 output frame; the source is centre-cropped and resized to it. Needs Pillow.
Inter is downloaded from the Google Fonts repository into ~/.cache/hubaajto-fonts on first run.
"""
import json
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = os.path.expanduser("~/.cache/hubaajto-fonts")
FONT_URL = "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
W, H = 1080, 1350


def inter(size, weight):
    path = os.path.join(FONT_DIR, "Inter.ttf")
    if not os.path.exists(path):
        os.makedirs(FONT_DIR, exist_ok=True)
        urllib.request.urlretrieve(FONT_URL, path)
    font = ImageFont.truetype(path, size)
    font.set_variation_by_axes([28, weight])  # optical size, weight
    return font


def fit(im):
    if im.size == (W, H):
        return im
    w, h = im.size
    target = W / H
    if w / h > target:
        nw = int(h * target)
        x0 = (w - nw) // 2
        im = im.crop((x0, 0, x0 + nw, h))
    else:
        nh = int(w / target)
        y0 = (h - nh) // 2
        im = im.crop((0, y0, w, y0 + nh))
    return im.resize((W, H), Image.LANCZOS)


def main(cfg_path):
    cfg = json.load(open(cfg_path))
    im = fit(Image.open(cfg["src"]).convert("RGB"))

    shade = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(shade)
    for x0, y0, x1, y1, s in cfg.get("shade", []):
        sd.rectangle((x0, y0, x1, y1), fill=int(255 * s))
    shade = shade.filter(ImageFilter.GaussianBlur(cfg.get("blur", 120)))
    dark = Image.new("RGB", (W, H), tuple(cfg.get("shade_rgb", (10, 11, 12))))
    im = Image.composite(dark, im, shade)

    d = ImageDraw.Draw(im)
    col = tuple(cfg.get("text_rgb", (246, 244, 238)))  # --color-paper
    hl = cfg["headline"]
    font = inter(hl["size"], hl.get("weight", 700))
    x, y = hl["x"], hl["y"]
    for line in hl["lines"]:
        d.text((x, y), line, font=font, fill=col)
        print(f"headline: {line!r} ends at x={x + round(d.textlength(line, font=font))}")
        y += hl["leading"]

    pb = cfg["product"]
    x, y = pb["x"], pb["y"]
    for text, size, weight, gap in pb["lines"]:
        d.text((x, y), text, font=inter(size, weight), fill=col)
        y += gap

    if "logo" in cfg:
        d.rectangle(tuple(cfg["logo"]), fill=col)

    im.save(cfg["out"])
    print("saved", cfg["out"], im.size)


if __name__ == "__main__":
    main(sys.argv[1])
