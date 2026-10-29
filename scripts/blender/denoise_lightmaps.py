"""
Tira o ruído do bake (pontinhos que pareciam sujeira nas paredes) sem borrar as sombras.
Uso: python scripts/blender/denoise_lightmaps.py <pasta build> [força]
Lê <build>/lightmaps/*.png (o original fica em <build>/lightmaps-raw/) e grava o resultado no lugar.
Precisa de opencv-python-headless.
"""

import os
import shutil
import sys

import cv2

BUILD = sys.argv[1]
H = float(sys.argv[2]) if len(sys.argv) > 2 else 14
src, raw = os.path.join(BUILD, "lightmaps"), os.path.join(BUILD, "lightmaps-raw")
os.makedirs(raw, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith(".png"):
        continue
    if not os.path.exists(os.path.join(raw, f)):
        shutil.copy(os.path.join(src, f), os.path.join(raw, f))
    img = cv2.imread(os.path.join(raw, f))
    # mediana tira os pontos isolados (vaga-lumes das fitas de LED); non-local means faz a média de trechos
    # parecidos (mantém as bordas das sombras e some com o granulado)
    out = cv2.fastNlMeansDenoisingColored(cv2.medianBlur(img, 3), None, H, H, 7, 21)
    cv2.imwrite(os.path.join(src, f), out)
    print("denoise", f, img.shape[:2], flush=True)
