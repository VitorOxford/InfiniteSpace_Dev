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
        
        # Invertemos a imagem e aplicamos um threshold para ter linhas brancas em fundo preto
        img_inverted = cv2.bitwise_not(img_gray)
        _, img_thresh = cv2.threshold(img_inverted, 127, 255, cv2.THRESH_BINARY)

        # --- LÓGICA DE DETECÇÃO DE LINHAS COM PARÂMETROS AJUSTADOS ---
        # threshold=50: Exige mais "votos" para considerar algo uma linha.
        # minLineLength=30: Ignora linhas com menos de 30 pixels.
        # maxLineGap=25: Permite um espaço de até 25 pixels entre segmentos para uni-los.
        lines = cv2.HoughLinesP(img_thresh, 1, np.pi / 180, threshold=50, minLineLength=30, maxLineGap=25)
        
        paths = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]

                # Convertendo os tipos de dados do NumPy para int padrão do Python
                x = int(min(x1, x2))
                y = int(min(y1, y2))
                w = int(abs(x2 - x1))
                h = int(abs(y2 - y1))
                
                # O caminho normalizado começa em (0,0)
                path_data = f"M {int(x1 - x)},{int(y1 - y)} L {int(x2 - x)},{int(y2 - y)}"

                paths.append({
                    "path": path_data,
                    "bbox": {"x": x, "y": y, "width": w, "height": h}
                })
        
        json_output = json.dumps(paths)
        return Response(content=json_output, media_type="application/json")

    except Exception as e:
        return JSONResponse(content={"detail": str(e)}, status_code=500)