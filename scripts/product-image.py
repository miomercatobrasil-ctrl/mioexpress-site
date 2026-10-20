"""Recorta a imagem oficial de um produto (fundo branco ou transparente) para assets/source/produtos/crop_<nome>.png.
Uso: python3 scripts/product-image.py <imagem> <nome>   e depois  node scripts/products-atlas.mjs"""
import sys
from PIL import Image, ImageChops

src, name = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
flat = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im).convert("RGB")
bb = ImageChops.difference(flat, Image.new("RGB", im.size, (255, 255, 255))).convert("L").point(lambda v: 255 if v > 14 else 0).getbbox()
flat.crop(bb).save(f"assets/source/produtos/crop_{name}.png")
print(name, im.size, bb)
