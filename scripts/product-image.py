"""Recorta a imagem oficial de um produto para assets/source/produtos/crop_<nome>.png, com o fundo
(branco ou transparente, ligado à borda) virando transparência.
Uso: python3 scripts/product-image.py <imagem> <nome>   e depois  node scripts/products-atlas.mjs"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, name = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert("RGBA")).astype(np.int16)
rgb, a = im[..., :3], im[..., 3]
# fundo: quase branco ou transparente, desde que encoste na borda (o branco dos rótulos fica)
near_bg = (a < 30) | (rgb.min(-1) > 238)
lab, _ = ndimage.label(near_bg)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
bg = ndimage.binary_dilation(bg, iterations=2)  # come a franja clara do antisserrilhado
alpha = np.where(bg, 0, np.minimum(a, 255)).astype(np.uint8)
ys, xs = np.nonzero(alpha)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
out = np.dstack([rgb.clip(0, 255).astype(np.uint8), alpha])[y0:y1, x0:x1]
Image.fromarray(out, "RGBA").save(f"assets/source/produtos/crop_{name}.png")
print(name, (x0, y0, x1, y1))
