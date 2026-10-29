"""
Tira o granulado do bake com o denoiser da Intel (OIDN, o mesmo do Cycles), chamando a biblioteca que vem com o bpy
(o compositor do Blender precisa de placa de vídeo; a biblioteca roda na CPU).
Uso: python scripts/blender/oidn_lightmaps.py <pasta build>
Lê <build>/lightmaps-raw/*.png (cópia sem filtro; criada a partir de lightmaps/ na primeira vez) e grava em lightmaps/.
"""

import ctypes
import glob
import os
import shutil
import sys

import bpy  # noqa: F401 (só para achar a pasta das bibliotecas)
import numpy as np
from PIL import Image

BUILD = sys.argv[1]
src, raw = os.path.join(BUILD, "lightmaps"), os.path.join(BUILD, "lightmaps-raw")
os.makedirs(raw, exist_ok=True)
for f in os.listdir(src):
    if f.endswith(".png") and not os.path.exists(os.path.join(raw, f)):
        shutil.copy(os.path.join(src, f), os.path.join(raw, f))

# bpy instalado pelo pip: as bibliotecas ficam em site-packages/bpy/lib
libdir = next(d for d in (os.path.join(p, "bpy", "lib") for p in sys.path) if glob.glob(os.path.join(d, "libOpenImageDenoise.so*")))
for dep in sorted(glob.glob(os.path.join(libdir, "libtbb*.so*"))):
    try:
        ctypes.CDLL(dep, mode=ctypes.RTLD_GLOBAL)
    except OSError:
        pass
for core in glob.glob(os.path.join(libdir, "libOpenImageDenoise_core.so*")):
    ctypes.CDLL(core, mode=ctypes.RTLD_GLOBAL)
oidn = ctypes.CDLL(os.path.join(libdir, "libOpenImageDenoise.so.2"))
P, I, C = ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p
oidn.oidnNewDevice.restype = P
oidn.oidnNewDevice.argtypes = [I]
oidn.oidnCommitDevice.argtypes = [P]
oidn.oidnNewFilter.restype = P
oidn.oidnNewFilter.argtypes = [P, C]
oidn.oidnSetSharedFilterImage.argtypes = [P, C, P, I, ctypes.c_size_t, ctypes.c_size_t, ctypes.c_size_t, ctypes.c_size_t, ctypes.c_size_t]
oidn.oidnSetFilterBool.argtypes = [P, C, ctypes.c_bool]
oidn.oidnCommitFilter.argtypes = [P]
oidn.oidnExecuteFilter.argtypes = [P]
oidn.oidnGetDeviceError.restype = I
oidn.oidnGetDeviceError.argtypes = [P, ctypes.POINTER(C)]
oidn.oidnReleaseFilter.argtypes = [P]

dev = oidn.oidnNewDevice(1)  # CPU
oidn.oidnCommitDevice(dev)
FLOAT3 = 3  # OIDN_FORMAT_FLOAT3

for f in sorted(os.listdir(raw)):
    if not f.endswith(".png"):
        continue
    img = np.asarray(Image.open(os.path.join(raw, f)).convert("RGB"), dtype=np.float32) / 255.0
    lin = np.ascontiguousarray(img ** 2.2)  # a imagem guarda a luz em gama 2.2; o OIDN quer luz linear (HDR)
    out = np.empty_like(lin)
    h, w = lin.shape[:2]
    flt = oidn.oidnNewFilter(dev, b"RT")
    oidn.oidnSetSharedFilterImage(flt, b"color", lin.ctypes.data, FLOAT3, w, h, 0, 0, 0)
    oidn.oidnSetSharedFilterImage(flt, b"output", out.ctypes.data, FLOAT3, w, h, 0, 0, 0)
    oidn.oidnSetFilterBool(flt, b"hdr", True)
    oidn.oidnCommitFilter(flt)
    oidn.oidnExecuteFilter(flt)
    msg = C()
    if oidn.oidnGetDeviceError(dev, ctypes.byref(msg)):
        print("erro OIDN", f, msg.value, flush=True)
        continue
    oidn.oidnReleaseFilter(flt)
    enc = np.clip(out, 0, 1) ** (1 / 2.2)
    Image.fromarray((enc * 255 + 0.5).astype(np.uint8)).save(os.path.join(src, f))
    print("oidn", f, (w, h), flush=True)
