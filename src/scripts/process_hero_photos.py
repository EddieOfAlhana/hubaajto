#!/usr/bin/env python3
"""Hero photo processing — agency-style color grading via PIL only.

Why no AI on hero photos: gpt-image-2 even with masking has some risk of
subtle door alteration. The doors in the curated hero photos already look great;
what they lack is consistent color grading, exposure, and atmosphere.
Real architectural retouchers solve this with Lightroom — we do the same in PIL.

Pipeline per photo:
  1. Read EXIF orientation, auto-rotate
  2. Crop to 4:5 (hero) or 16:10 (before/after) with smart centering
  3. Adjust exposure (+0.15 EV equivalent)
  4. White balance shift toward neutral-warm
  5. Lift shadows slightly, deepen blacks
  6. Reduce mid-tone saturation -8% (premium-feeling look)
  7. Subtle vignette
  8. Output AVIF + WebP at 1600px wide
"""

import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageDraw, ImageFilter
import numpy as np

OUT_HERO = Path("/Users/hu900676/repos/projects/hubaajto/Huba ajtó/website/public/assets/photos/hero")
OUT_HERO.mkdir(parents=True, exist_ok=True)

PHOTOS = [
    {
        "src": "/Users/hu900676/Downloads/huba/IMG_2328.jpeg",
        "out_name": "period-yellow",
        "aspect": "4:5",
        "alt_desc": "Yellow period door with wrought-iron glass grilles, Buda közép luxury hallway",
    },
    {
        "src": "/Users/hu900676/Downloads/huba/IMG_1586.jpeg",
        "out_name": "period-green",
        "aspect": "4:5",
        "alt_desc": "Forest-green period door with diamond grille, Buda közép cast-iron staircase",
    },
    {
        "src": "/Users/hu900676/Downloads/Ajtók/2szárny.jpg",
        "out_name": "period-double-leaf",
        "aspect": "4:5",
        "alt_desc": "Yellow double-leaf period door with iron filigree, polgári lakás courtyard",
    },
    {
        "src": "/Users/hu900676/Downloads/huba/IMG_3971.JPG",
        "out_name": "modern-white",
        "aspect": "4:5",
        "alt_desc": "Modern white door with three glass slits, Buda közép period archway",
    },
    {
        "src": "/Users/hu900676/Downloads/huba/IMG_1933.JPG",
        "out_name": "modern-anthracite",
        "aspect": "4:5",
        "alt_desc": "Dark modern door with single frosted glass strip, Pest belváros",
    },
    {
        "src": "/Users/hu900676/Downloads/huba/IMG_4140.jpeg",
        "out_name": "period-restoration",
        "aspect": "4:5",
        "alt_desc": "Period door restoration in progress, stripped wood, herringbone parquet",
    },
    {
        "src": "/Users/hu900676/Downloads/huba/IMG_0997.JPG",
        "out_name": "period-brown",
        "aspect": "4:5",
        "alt_desc": "Brown period door with iron filigree grille, Pest belváros",
    },
    {
        "src": "/Users/hu900676/Downloads/Ajtók/ajtó1 013.jpg",
        "out_name": "workshop",
        "aspect": "4:3",
        "alt_desc": "Huba workshop in Kistarcsa with completed 9-panel period door, 2006",
    },
]


def smart_crop(img: Image.Image, target_aspect: tuple[int, int]) -> Image.Image:
    """Crop to target aspect ratio, centered."""
    tw, th = target_aspect
    target_ratio = tw / th
    w, h = img.size
    cur_ratio = w / h
    if cur_ratio > target_ratio:
        # too wide — crop sides
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        # too tall — crop top/bottom (a bit weighted toward keeping the top)
        new_h = int(w / target_ratio)
        top = max(0, int((h - new_h) * 0.4))  # slight top bias for door subjects
        return img.crop((0, top, w, top + new_h))


def warm_white_balance(arr: np.ndarray, strength: float = 0.04) -> np.ndarray:
    """Shift slightly toward warm-neutral — adds to R, subtracts a touch from B."""
    arr = arr.astype(np.float32)
    arr[..., 0] = np.clip(arr[..., 0] + 255 * strength * 0.6, 0, 255)  # red
    arr[..., 2] = np.clip(arr[..., 2] - 255 * strength * 0.3, 0, 255)  # blue
    return arr


def lift_shadows_deep_blacks(arr: np.ndarray, lift: float = 0.06, deepen: float = 0.04) -> np.ndarray:
    """S-curve lite: lift dark mids, deepen the very darkest tones."""
    arr = arr.astype(np.float32) / 255.0
    # Lift mids
    arr = np.where(arr < 0.5, arr + (0.5 - arr) * lift, arr)
    # Deepen blacks
    arr = np.where(arr < 0.15, arr - (0.15 - arr) * deepen, arr)
    return np.clip(arr * 255, 0, 255)


def add_vignette(img: Image.Image, strength: float = 0.22) -> Image.Image:
    """Soft circular vignette."""
    w, h = img.size
    # Create radial gradient mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    # outer ellipse white in centre fading to black at edges
    for i in range(60):
        alpha = int(255 * (1 - i / 60))
        bbox = (-i * w // 120, -i * h // 120, w + i * w // 120, h + i * h // 120)
        draw.ellipse(bbox, fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=min(w, h) // 8))
    # darken the original by mixing with a black layer using the inverted mask
    black = Image.new("RGB", (w, h), (0, 0, 0))
    inv = Image.eval(mask, lambda x: int((255 - x) * strength))
    return Image.composite(black, img, inv)


def grade(img: Image.Image) -> Image.Image:
    """Apply full color-grade chain."""
    # 1. EXIF auto-rotate
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 2. White balance + black levels + mid-shadow lift
    arr = np.array(img)
    arr = warm_white_balance(arr, strength=0.035)
    arr = lift_shadows_deep_blacks(arr, lift=0.05, deepen=0.06)
    img = Image.fromarray(arr.astype(np.uint8))

    # 3. Slight exposure boost
    img = ImageEnhance.Brightness(img).enhance(1.04)

    # 4. Contrast bump
    img = ImageEnhance.Contrast(img).enhance(1.08)

    # 5. Desat mid-tones (premium look)
    img = ImageEnhance.Color(img).enhance(0.92)

    # 6. Vignette
    img = add_vignette(img, strength=0.18)

    return img


def process_one(spec: dict) -> tuple[Path, Path]:
    src = Path(spec["src"])
    name = spec["out_name"]
    aspect = spec["aspect"]
    aspect_tuple = (4, 5) if aspect == "4:5" else (16, 10) if aspect == "16:10" else (4, 3)

    print(f"  → {name}  ({src.name})")
    img = Image.open(src)

    # Apply EXIF orientation BEFORE crop
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Smart crop to aspect
    img = smart_crop(img, aspect_tuple)

    # Resize to ~1600 wide
    target_w = 1600
    w, h = img.size
    if w > target_w:
        img = img.resize((target_w, int(h * target_w / w)), Image.LANCZOS)

    # Color grade
    img = grade(img)

    # Save as JPG (universal) and WebP (modern)
    jpg = OUT_HERO / f"{name}.jpg"
    webp = OUT_HERO / f"{name}.webp"
    img.save(jpg, "JPEG", quality=88, optimize=True, progressive=True)
    img.save(webp, "WEBP", quality=84, method=6)
    print(f"     saved {jpg.name} ({jpg.stat().st_size//1024} KB), {webp.name} ({webp.stat().st_size//1024} KB)")
    return jpg, webp


if __name__ == "__main__":
    for spec in PHOTOS:
        try:
            process_one(spec)
        except Exception as e:
            print(f"     FAILED {spec['out_name']}: {e}")
    print("Done.")
