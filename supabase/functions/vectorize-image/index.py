# supabase/functions/vectorize-image/index.py
import base64, cv2, numpy as np, svgwrite, io
from fastapi import FastAPI
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware # Importa o Middleware

app = FastAPI()

# Adiciona o middleware de CORS para permitir todas as origens
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/")
async def vectorize_image(payload: ImagePayload):
    try:
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
        img_inverted = cv2.bitwise_not(img_gray)
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
        return Response(content=svg_string, media_type="image/svg+xml")
    except Exception as e:
        return JSONResponse(content={"detail": str(e)}, status_code=500)