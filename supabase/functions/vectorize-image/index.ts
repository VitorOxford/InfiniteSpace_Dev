// supabase/functions/proxy-vectorizer/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Pega a URL da nossa API Python a partir dos segredos do Supabase
const RENDER_API_URL = Deno.env.get('RENDER_VECTORIZER_URL')

serve(async (req) => {
  // Tratamento de CORS para permitir que seu app Vue chame esta função
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } })
  }

  try {
    // Pega o 'imageDataUrl' que o seu app Vue enviou
    const { imageDataUrl } = await req.json()

    if (!imageDataUrl) {
      throw new Error('imageDataUrl não foi fornecido no corpo da requisição.')
    }

    if (!RENDER_API_URL) {
      throw new Error('A URL da API de vetorização não está configurada nos segredos.')
    }

    // Chama a sua API Python que está no Render
    const responseToRender = await fetch(RENDER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl }),
    })

    if (!responseToRender.ok) {
      const errorBody = await responseToRender.text();
      throw new Error(`Erro na API do Render: ${responseToRender.status} - ${errorBody}`)
    }

    // Pega o SVG retornado pelo Python
    const svgResult = await responseToRender.text()

    // Envia o SVG de volta para o seu app Vue
    return new Response(svgResult, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'image/svg+xml',
      },
      status: 200,
    })

  } catch (err) {
    return new Response(String(err?.message ?? err), {
      headers: { 'Access-Control-Allow-Origin': '*' },
      status: 500,
    })
  }
})
