# supabase/functions/vectorize-image/index.py
import base64, cv2, numpy as np, io, json
from fastapi import FastAPI
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    imageDataUrl: str

def serialize_int(value):
    return int(value)

@app.post("/")
async def vectorize_image(payload: ImagePayload):
    try:
        # 1. Decodificar e preparar a imagem
        image_data_base64 = payload.imageDataUrl.split(',')[1]
        image_bytes = base64.b64decode(image_data_base64)
        pil_image = Image.open(io.BytesIO(image_bytes))

        if pil_image.mode == 'RGBA':
            bg = Image.new('RGB', pil_image.size, (255, 255, 255))
            bg.paste(pil_image, (0, 0), pil_image)
            img_cv = np.array(bg)
        else:
            img_cv = np.array(pil_image.convert('RGB'))

        img_gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)
        img_blur = cv2.GaussianBlur(img_gray, (5, 5), 0)
        img_inverted = cv2.bitwise_not(img_blur)
        _, img_thresh = cv2.threshold(img_inverted, 127, 255, cv2.THRESH_BINARY)

        # 2. Encontrar Contornos
        contours, _ = cv2.findContours(img_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        paths = []

        # 3. Processar cada contorno
        for cnt in contours:
            if cv2.contourArea(cnt) < 10:
                continue

            epsilon = 0.008 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            
            x, y, w, h = cv2.boundingRect(approx)

            if len(approx) > 1:
                # Cria um único path relativo ao seu BBox
                path_data = "M " + " L ".join(f"{serialize_int(pt[0][0] - x)},{serialize_int(pt[0][1] - y)}" for pt in approx)
                if cv2.isContourConvex(approx):
                    path_data += " Z"
                
                paths.append({
                    "path": path_data,
                    "bbox": {
                        "x": serialize_int(x), "y": serialize_int(y),
                        "width": serialize_int(w), "height": serialize_int(h)
                    }
                })

        return Response(content=json.dumps(paths), media_type="application/json")

    except Exception as e:
        return JSONResponse(content={"detail": str(e)}, status_code=500)