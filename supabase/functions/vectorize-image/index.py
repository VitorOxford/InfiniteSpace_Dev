# supabase/functions/vectorize-image/index.py

import base64
import cv2
import numpy as np
import svgwrite
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from PIL import Image
import io
# Importa o middleware de CORS
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- CORREÇÃO DEFINITIVA DE CORS ---
# Adiciona o middleware à sua aplicação.
# Isto irá automaticamente lidar com os pedidos OPTIONS (preflight)
# e adicionar os cabeçalhos corretos a TODAS as respostas.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite pedidos de qualquer origem (localhost, etc.)
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"], # Permite os métodos POST e OPTIONS
    allow_headers=["*"], # Permite todos os cabeçalhos
)
# --- FIM DA CORREÇÃO ---


class ImagePayload(BaseModel):
    imageDataUrl: str

def create_svg_from_skeleton(skeleton_image):
    contours, _ = cv2.findContours(skeleton_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = skeleton_image.shape
    dwg = svgwrite.Drawing(size=(f"{width}px", f"{height}px"), profile='tiny')
    for contour in contours:
        path_data = "M" + " L".join(f"{p[0][0]},{p[0][1]}" for p in contour)
        dwg.add(dwg.path(d=path_data, fill="none", stroke="black", stroke_width=2))
    return dwg.tostring()

# Removemos a rota OPTIONS manual, o middleware já trata disso.
@app.post("/")
async def vectorize_image(payload: ImagePayload):
    try:
        image_data_base64 = payload.imageDataUrl.split(',')[1]
        image_bytes = base64.b64decode(image_data_base64)
        
        pil_image = Image.open(io.BytesIO(image_bytes)).convert('L')
        img = np.array(pil_image)
        
        # Garante fundo branco para o processamento
        if pil_image.mode == 'RGBA':
             # Cria um fundo branco
            bg = Image.new('RGB', pil_image.size, (255, 255, 255))
            # Cola a imagem com transparência sobre o fundo branco
            bg.paste(pil_image, (0, 0), pil_image)
            img = np.array(bg.convert('L'))

        img_inverted = cv2.bitwise_not(img)
        _, img_thresh = cv2.threshold(img_inverted, 127, 255, cv2.THRESH_BINARY)

        skeleton = np.zeros(img_thresh.shape, np.uint8)
        element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3,3))
        
        while cv2.countNonZero(img_thresh) != 0:
            eroded = cv2.erode(img_thresh, element)
            temp = cv2.dilate(eroded, element)
            temp = cv2.subtract(img_thresh, temp)
            skeleton = cv2.bitwise_or(skeleton, temp)
            img_thresh = eroded.copy()
        
        svg_string = create_svg_from_skeleton(skeleton)

        # O middleware já adiciona os cabeçalhos CORS automaticamente
        return Response(content=svg_string, media_type="image/svg+xml")

    except Exception as e:
        print(f"ERROR: {e}")
        # O middleware também adiciona os cabeçalhos em caso de erro
        return JSONResponse(content={"detail": str(e)}, status_code=500)