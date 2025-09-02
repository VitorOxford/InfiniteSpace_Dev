// src/stores/canvasStore.js
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { supabase } from '@/supabase'
import { v4 as uuidv4 } from 'uuid'
import { useImageAdjustmentsStore } from './imageAdjustmentsStore'
import { useLayerHistoryStore } from './layerHistoryStore'
import { useHistoryStore } from './historyStore'

// --- FUNÇÕES HELPER (sem alterações) ---
function parsePathData(pathData) {
  if (!pathData) return [];
  const points = [];
  const commands = pathData.trim().match(/[a-df-z][^a-df-z]*/ig) || [];

  commands.forEach(commandStr => {
    const type = commandStr.charAt(0);
    const args = commandStr.substring(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

    if (type.toUpperCase() === 'Z') {
      points.push({ command: 'Z' });
      return;
    }

    const argsPerPoint = (type.toUpperCase() === 'Q') ? 4 : 2;

    for (let i = 0; i < args.length; ) {
      const currentArgs = args.slice(i, i + argsPerPoint);
      if (currentArgs.length === argsPerPoint) {
        if (type.toUpperCase() === 'Q') {
          points.push({ command: type, cp1x: currentArgs[0], cp1y: currentArgs[1], x: currentArgs[2], y: currentArgs[3] });
          i += 4;
        } else {
          points.push({ command: type, x: currentArgs[0], y: currentArgs[1] });
          i += 2;
        }
      } else { break; }
    }
  });
  return points;
}

function pointsToPathData(points) {
    if (!points || points.length === 0) return "";
    let d = "";
    points.forEach(p => {
        if (p.command.toUpperCase() === 'Z') {
            d += 'Z ';
        } else if (p.command.toUpperCase() === 'Q') {
            d += `Q ${p.cp1x},${p.cp1y} ${p.x},${p.y} `;
        }
        else if (p.x !== null && p.y !== null) {
            d += `${p.command} ${p.x},${p.y} `;
        }
    });
    return d.trim();
}


async function normalizeImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const normalizedImg = new Image();
      normalizedImg.onload = () => resolve(normalizedImg);
      normalizedImg.onerror = reject;
      normalizedImg.src = canvas.toDataURL();
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}


export const useCanvasStore = defineStore('canvas', () => {
  const layerHistoryStore = useLayerHistoryStore();
  const globalHistoryStore = useHistoryStore();

  const layers = ref([])
  const folders = ref([])
  const selectedLayerId = ref(null)
  const activeTool = ref('move')
  const primaryColor = ref('#000000')


  const editingVector = reactive({
    layerId: null,
    points: [],
    draggedPointIndex: null,
    draggedPointType: null, // 'anchor' ou 'control'
    originalStateBeforeDrag: null,
    originalPoints: [],
  });

  const brush = reactive({
    size: 20,
    opacity: 1,
    hardness: 0.9,
    sensitivity: 0.5,
    type: 'basic',
    taper: 80,
  });
  const eraser = reactive({ size: 40, opacity: 1 });
  const copiedSelection = ref(null);
  const copiedFolder = ref(null);

  const workspace = reactive({
    pan: { x: 0, y: 0 },
    zoom: 1,
    viewMode: 'edit',
    document: { width: 1920, height: 1080 },
    rulers: { visible: true, unit: 'cm' },
    grid: { visible: true },
    previewIsInteractive: false,
    previewZoom: 1,
    previewRenderScale: 1,
    isTransforming: false,
    isVectorizing: false,
    panels: {
      layers: { isVisible: true, isPinned: false, position: { top: 60, left: window.innerWidth - 320 }, size: { width: 300, height: 500 } },
        toolOptions: { isVisible: false, isPinned: false, position: { top: 80, left: 72 }, size: { width: 280, height: 'auto' } },
        layerHistory: { isVisible: false, isPinned: false, position: { top: 120, left: 400 }, size: { width: 320, height: 450 } },
        globalHistory: { isVisible: false, isPinned: false, position: { top: 160, left: 450 }, size: { width: 320, height: 450 } },
    },
    historyModalTargetLayerId: null,
    lasso: {
      active: false,
      points: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    },
    magicWand: {
      active: false,
      tolerance: 30,
      contiguous: true,
      selectionMask: null,
      initialColor: null,
    },
    selection: {
      active: false,
      startX: 0, startY: 0, endX: 0, endY: 0,
      width: 0, height: 0, dimPxW: 0, dimPxH: 0,
      dimCmW: 0, dimCmH: 0,
    },
    transformStart: {
      scale: 1, rotation: 0, layerRotation: 0,
      mousePos: { x: 0, y: 0 }, layerCenter: { x: 0, y: 0 },
    },
    isContextMenuVisible: false,
    contextMenuPosition: { x: 0, y: 0 },
    contextMenuTargetId: null,
    contextMenuIsFolder: false,
    isSelectionContextMenuVisible: false,
    selectionContextMenuPosition: { x: 0, y: 0 },
    isResizeModalVisible: false,
    isPreviewSidebarVisible: false,
    isSignatureModalVisible: false,
    shapeDrawing: {
      active: false,
      type: 'rectangle',
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      tempLayerId: null,
    },
  });

  const selectedLayer = computed(() => layers.value.find((l) => l.id === selectedLayerId.value));
  const mockupLayer = computed(() => layers.value.find((l) => l.type === 'mockup' && l.visible));
  const isSelectionActive = computed(() => workspace.lasso.points.length > 2 || workspace.selection.width > 0);

  const rulerSource = computed(() => {
    const layer = selectedLayer.value || mockupLayer.value
    if (layer && layer.metadata.originalWidth) {
      const width = layer.metadata.originalWidth * layer.scale
      const height = layer.metadata.originalHeight * layer.scale
      return {
        width,
        height,
        dpi: layer.metadata.dpi || 96,
        x: layer.x - width / 2,
        y: layer.y - height / 2,
      }
    }
    return {
      width: workspace.document.width,
      height: workspace.document.height,
      dpi: 96,
      x: 0,
      y: 0,
    }
  })

  function enterVectorEditMode(layerId) {
    const layer = layers.value.find(l => l.id === layerId);
    if (!layer || layer.type !== 'vector') return;
    if(editingVector.layerId === layerId) return;

    clearSelection();
    editingVector.layerId = layerId;
    editingVector.points = parsePathData(layer.pathData);
    editingVector.originalPoints = JSON.parse(JSON.stringify(editingVector.points));
    editingVector.originalStateBeforeDrag = getClonedLayerState(layer);
    setActiveTool('direct-select');
  }

  // --- LÓGICA DE PINTURA TOTALMENTE REFEITA ---
  function applyPaintToLayer(fullStroke) {
    if (!selectedLayer.value || fullStroke.length === 0) return;

    const layer = selectedLayer.value;
    if (layer.image instanceof ImageBitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = layer.image.width;
        canvas.height = layer.image.height;
        canvas.getContext('2d').drawImage(layer.image, 0, 0);
        layer.image = canvas;
    }
    const ctx = layer.image.getContext('2d');
    ctx.save();
    ctx.globalAlpha = brush.opacity;
    ctx.strokeStyle = primaryColor.value;
    ctx.fillStyle = primaryColor.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Simula a dureza (hardness) usando shadowBlur
    const baseSize = brush.size / layer.scale / workspace.zoom;
    ctx.shadowColor = primaryColor.value;

    // Se for um clique único, desenha um círculo
    if (fullStroke.length < 2) {
      const point = fullStroke[0];
      const taperAmount = brush.taper > 0 ? (1.0 - (brush.taper / 100)) / 2 : 1.0;
      const radius = Math.max(0.5, (baseSize / 2) * taperAmount);

      ctx.shadowBlur = (1 - brush.hardness) * radius;

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      layer.version++;
      return;
    }

    // Calcula o comprimento total do traço
    let totalStrokeLength = 0;
    for (let i = 1; i < fullStroke.length; i++) {
        totalStrokeLength += Math.hypot(fullStroke[i].x - fullStroke[i-1].x, fullStroke[i].y - fullStroke[i-1].y);
    }

    let distanceTraveled = 0;
    for (let i = 1; i < fullStroke.length; i++) {
      const lastPoint = fullStroke[i - 1];
      const currentPoint = fullStroke[i];
      const segmentLength = Math.hypot(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y);

      // Calcula o afilamento (taper) baseado na posição ao longo do traço completo
      const taperStartFraction = brush.taper / 100;
      const taperEndFraction = 1.0 - taperStartFraction;
      let taper = 1.0;
      if (totalStrokeLength > 0) {
          const progress = distanceTraveled / totalStrokeLength;
          if (progress < taperStartFraction) {
              taper = progress / taperStartFraction;
          } else if (progress > taperEndFraction && taperStartFraction > 0) { // Evita divisão por zero
              taper = (1.0 - progress) / taperStartFraction;
          }
      }
      taper = Math.max(0.1, Math.min(1.0, taper));

      // Calcula a largura dinâmica baseada na velocidade (sensibilidade)
      const speed = Math.max(0.1, segmentLength);
      const dynamicWidth = baseSize / (1 + (speed * brush.sensitivity));
      const lineWidth = Math.max(0.5, dynamicWidth * taper);

      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = (1 - brush.hardness) * (lineWidth / 2);

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();

      distanceTraveled += segmentLength;
    }

    ctx.restore();
    layer.version++;
  }


  function exitVectorEditMode() {
    if (editingVector.layerId) {
        if(editingVector.originalStateBeforeDrag && JSON.stringify(editingVector.originalStateBeforeDrag) !== JSON.stringify(getClonedLayerState(selectedLayer.value))) {
            commitLayerStateToHistory(editingVector.layerId, editingVector.originalStateBeforeDrag, 'Editar Vetor');
        }
    }
    editingVector.layerId = null;
    editingVector.points = [];
    editingVector.draggedPointIndex = null;
    editingVector.originalPoints = [];
    editingVector.originalStateBeforeDrag = null;
    if (activeTool.value === 'direct-select') {
        activeTool.value = 'move';
    }
  }

  function updateVectorLayerGeometry(layer, localPoints) {
      let newMinX = Infinity, newMinY = Infinity, newMaxX = -Infinity, newMaxY = -Infinity;
      localPoints.forEach(p => {
          if (p.command.toUpperCase() === 'Z') return;
          newMinX = Math.min(newMinX, p.x);
          newMinY = Math.min(newMinY, p.y);
          newMaxX = Math.max(newMaxX, p.x);
          newMaxY = Math.max(newMaxY, p.y);

          if (p.command.toUpperCase() === 'Q') {
              newMinX = Math.min(newMinX, p.cp1x);
              newMinY = Math.min(newMinY, p.cp1y);
              newMaxX = Math.max(newMaxX, p.cp1x);
              newMaxY = Math.max(newMaxY, p.cp1y);
          }
      });

      const newWidth = (newMaxX - newMinX) || 1;
      const newHeight = (newMaxY - newMinY) || 1;

      const normalizedPoints = localPoints.map(p => {
        if (p.command.toUpperCase() === 'Z') return p;
        const newPoint = { ...p, x: p.x - newMinX, y: p.y - newMinY };
        if (p.command.toUpperCase() === 'Q') {
          newPoint.cp1x -= newMinX;
          newPoint.cp1y -= newMinY;
        }
        return newPoint;
      });

      const { scale, rotation } = layer;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const worldShiftX = (newMinX * cos - newMinY * sin) * scale;
      const worldShiftY = (newMinX * sin + newMinY * cos) * scale;

      layer.x += worldShiftX;
      layer.y += worldShiftY;
      layer.metadata.originalWidth = newWidth;
      layer.metadata.originalHeight = newHeight;
      layer.pathData = pointsToPathData(normalizedPoints);

      editingVector.points = normalizedPoints;
      layer.version++;
  }

  function moveVectorPoint(newLayerCoords) {
      if (editingVector.layerId === null || editingVector.draggedPointIndex === null) return;
      const layer = layers.value.find(l => l.id === editingVector.layerId);
      if (!layer) return;

      const localPoints = JSON.parse(JSON.stringify(editingVector.points));
      localPoints[editingVector.draggedPointIndex].x = newLayerCoords.x;
      localPoints[editingVector.draggedPointIndex].y = newLayerCoords.y;

      updateVectorLayerGeometry(layer, localPoints);
  }

  function moveVectorControlPoint(newLayerCoords) {
      if (editingVector.layerId === null || editingVector.draggedPointIndex === null) return;
      const layer = layers.value.find(l => l.id === editingVector.layerId);
      if (!layer) return;

      const localPoints = JSON.parse(JSON.stringify(editingVector.points));
      const pointToEdit = localPoints[editingVector.draggedPointIndex];

      if (pointToEdit.command.toUpperCase() !== 'Q') return;

      pointToEdit.cp1x = newLayerCoords.x;
      pointToEdit.cp1y = newLayerCoords.y;

      updateVectorLayerGeometry(layer, localPoints);
  }

  function addCurvePoint(layerId, pointIndex) {
    const layer = layers.value.find(l => l.id === layerId);
    if (!layer || !editingVector.layerId || layer.id !== editingVector.layerId) return;

    const p1 = editingVector.points[pointIndex - 1];
    const p2 = editingVector.points[pointIndex];

    if (p2.command.toUpperCase() === 'Q' || (p1 && p1.command.toUpperCase() === 'Z')) return;

    const controlPointX = (p1.x + p2.x) / 2;
    const controlPointY = (p1.y + p2.y) / 2;

    p2.command = 'Q';
    p2.cp1x = controlPointX;
    p2.cp1y = controlPointY;

    layer.pathData = pointsToPathData(editingVector.points);
    layer.version++;
    editingVector.originalStateBeforeDrag = getClonedLayerState(layer);
  }

  function initializeEmptyWorkspace() {
    if (layers.value.length === 0) {
      createBlankCanvas({
        name: 'Fundo',
        width: 1920,
        height: 1080,
        unit: 'px',
        dpi: 72,
      });
    }
  }

  function zoomAtPoint(factor, point) {
      const { pan, zoom } = workspace;
      const worldX = (point.x - pan.x) / zoom;
      const worldY = (point.y - pan.y) / zoom;
      const newZoom = Math.max(0.02, Math.min(zoom * factor, 10));
      const newPanX = point.x - worldX * newZoom;
      const newPanY = point.y - worldY * newZoom;
      updateWorkspace({ zoom: newZoom, pan: { x: newPanX, y: newPanY } });
  }

  function zoomIn(factor = 1.2) {
      const canvasEl = document.getElementById('mainCanvas');
      if (!canvasEl) return;
      const center = { x: canvasEl.clientWidth / 2, y: canvasEl.clientHeight / 2 };
      zoomAtPoint(factor, center);
  }

  function zoomOut(factor = 1.2) {
      zoomIn(1 / factor);
  }

  function zoomToFit() {
      const canvasEl = document.getElementById('mainCanvas');
      if (!canvasEl || layers.value.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      layers.value.forEach(layer => {
          const halfW = (layer.metadata.originalWidth * layer.scale) / 2;
          const halfH = (layer.metadata.originalHeight * layer.scale) / 2;
          minX = Math.min(minX, layer.x - halfW);
          minY = Math.min(minY, layer.y - halfH);
          maxX = Math.max(maxX, layer.x + halfW);
          maxY = Math.max(maxY, layer.y + halfH);
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - maxY;
      const contentCenterX = minX + contentWidth / 2;
      const contentCenterY = minY + contentHeight / 2;

      const padding = 0.9;
      const zoomX = (canvasEl.clientWidth * padding) / contentWidth;
      const zoomY = (canvasEl.clientHeight * padding) / contentHeight;
      const newZoom = Math.min(zoomX, zoomY, 2);

      workspace.zoom = newZoom;
      workspace.pan.x = canvasEl.clientWidth / 2 - contentCenterX * newZoom;
      workspace.pan.y = canvasEl.clientHeight / 2 - contentCenterY * newZoom;
  }

  function togglePanel(panelId, visible, targetLayerId = null) {
      if (!workspace.panels[panelId]) {
          console.error(`Painel com ID '${panelId}' não encontrado.`);
          return;
      }

      if (typeof visible === 'boolean') {
          workspace.panels[panelId].isVisible = visible;
      } else {
          workspace.panels[panelId].isVisible = !workspace.panels[panelId].isVisible;
      }

      if (panelId === 'layerHistory' && visible) {
          workspace.historyModalTargetLayerId = targetLayerId;
      }
  }

  function updatePanelState(panelId, newState) {
      if (workspace.panels[panelId]) {
          Object.assign(workspace.panels[panelId], newState);
      }
  }

  function getPanelState(panelId) {
      return workspace.panels[panelId];
  }


function updateLayerThumbnail(layer) {
    if (layer && layer.image) {
      const thumbCanvas = document.createElement('canvas');
      const MAX_THUMB_SIZE = 128;
      const ratio = Math.min(MAX_THUMB_SIZE / layer.image.width, MAX_THUMB_SIZE / layer.image.height, 1);
      thumbCanvas.width = layer.image.width * ratio;
      thumbCanvas.height = layer.image.height * ratio;
      thumbCanvas.getContext('2d').drawImage(layer.image, 0, 0, thumbCanvas.width, thumbCanvas.height);
      layer.imageUrl = thumbCanvas.toDataURL();
    } else if (layer && layer.type === 'vector') {
        layer.imageUrl = null;
    }
  }

  function getClonedLayerState(layer) {
      if (!layer) return null;
      if (layer.image) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = layer.image.width;
          tempCanvas.height = layer.image.height;
          tempCanvas.getContext('2d').drawImage(layer.image, 0, 0);

          return {
              id: layer.id, name: layer.name, type: layer.type,
              visible: layer.visible, opacity: layer.opacity,
              x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation,
              metadata: JSON.parse(JSON.stringify(layer.metadata)),
              adjustments: JSON.parse(JSON.stringify(layer.adjustments)),
              imageDataUrl: tempCanvas.toDataURL(),
          };
      }
      if (layer.type === 'vector') {
          return JSON.parse(JSON.stringify(layer));
      }
      return null;
  }

  function getClonedGlobalState() {
      return {
          layers: layers.value.map(l => getClonedLayerState(l)),
          layersWithImage: layers.value.map(l => ({...getClonedLayerState(l), imageUrl: l.imageUrl, originalFile: l.originalFile})),
          workspace: JSON.parse(JSON.stringify(workspace)),
      };
  }

  function commitLayerStateToHistory(layerId, initialState, actionName) {
      if (!initialState) return;
      const layer = layers.value.find(l => l.id === layerId);
      const finalState = getClonedLayerState(layer);
      if (JSON.stringify(initialState) !== JSON.stringify(finalState)) {
          layerHistoryStore.addLayerState(layerId, initialState, actionName);
          updateLayerThumbnail(layer);
      }
  }

  function createLayerObject(name, type, url, metadata = {}) {
    return reactive({
      id: uuidv4(),
      name,
      type,
      visible: true,
      opacity: 1,
      image: null,
      fullResImage: null,
      lowResProxy: null,
      imageUrl: url,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      metadata: {
        dpi: metadata?.dpi || 96,
        originalWidth: 0,
        originalHeight: 0,
        ...metadata
      },
      originalFile: null,
      adjustments: {
        grayscale: 0, sepia: 0, saturate: 100,
        contrast: 100, brightness: 100, invert: 0,
        flipH: false, flipV: false,
      },
      pathData: type === 'vector' ? metadata.pathData || '' : undefined,
      version: 1,
    })
  }

  async function processAndAddLayer(newLayerData) {
    const { name, type, imageUrl, metadata, initialPosition, file, initialScale } = newLayerData;
    const newLayer = createLayerObject(name, type, imageUrl, metadata);

    if (file) {
      newLayer.originalFile = file;
      const worker = new Worker(new URL('../utils/imageProcessor.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const { status, payload } = e.data;
        if (status === 'success') {
          const { dpi, imageBitmap, proxyBitmap, lowResProxy, originalWidth, originalHeight } = payload;
          newLayer.metadata = { ...newLayer.metadata, dpi, originalWidth, originalHeight };
          newLayer.image = proxyBitmap || imageBitmap;
          newLayer.fullResImage = imageBitmap;
          newLayer.lowResProxy = lowResProxy;
          finalizeLayerAddition(newLayer, initialPosition, initialScale);
        } else {
          console.error("Erro ao processar a imagem no worker:", payload);
          alert("Houve um erro ao carregar a imagem. Tente novamente.");
        }
        worker.terminate();
      };
      worker.onerror = (e) => {
        console.error("Erro fatal no worker de imagem:", e);
        alert("Ocorreu um erro inesperado ao processar a imagem.");
        worker.terminate();
      };
      worker.postMessage({ file });
    } else if (imageUrl) {
      try {
        const normalizedImg = await normalizeImage(imageUrl);
        const imageWidth = metadata.originalWidth || normalizedImg.width;
        const imageHeight = metadata.originalHeight || normalizedImg.height;
        const renderCanvas = document.createElement('canvas');
        renderCanvas.width = imageWidth;
        renderCanvas.height = imageHeight;
        renderCanvas.getContext('2d').drawImage(normalizedImg, 0, 0);
        newLayer.image = renderCanvas;
        newLayer.fullResImage = renderCanvas;
        newLayer.metadata.originalWidth = imageWidth;
        newLayer.metadata.originalHeight = imageHeight;
        finalizeLayerAddition(newLayer, initialPosition, initialScale);
      } catch (error) {
        console.error("Erro ao carregar e normalizar a imagem da web:", error);
        alert("Houve um erro ao carregar a imagem. Tente novamente.");
      }
    } else {
        finalizeLayerAddition(newLayer, initialPosition, initialScale);
    }
  }

  function finalizeLayerAddition(newLayer, initialPosition, initialScale = 1) {
      if (newLayer.type === 'mockup' && !initialPosition) {
        workspace.document.width = newLayer.metadata.originalWidth;
        workspace.document.height = newLayer.metadata.originalHeight;
      }
      newLayer.x = initialPosition ? initialPosition.x : workspace.document.width / 2;
      newLayer.y = initialPosition ? initialPosition.y : workspace.document.height / 2;
      newLayer.scale = initialScale;
      updateLayerThumbnail(newLayer);
      layers.value.push(newLayer);
      layerHistoryStore.addLayerState(newLayer.id, getClonedLayerState(newLayer), 'Criação da Camada');
      globalHistoryStore.addState(getClonedGlobalState(), `Adicionar Camada: ${newLayer.name}`);
      selectLayer(newLayer.id);
      frameLayer(newLayer.id);
  }

  function setActiveTool(tool) {
      if (workspace.shapeDrawing) {
        workspace.shapeDrawing.active = false;
        workspace.shapeDrawing.tempLayerId = null;
      }

      if (activeTool.value === 'direct-select' && tool !== 'direct-select') {
        exitVectorEditMode();
      }
      activeTool.value = tool;
      if (tool === 'direct-select' && selectedLayer.value && selectedLayer.value.type === 'vector') {
          enterVectorEditMode(selectedLayer.value.id);
      }
      if (!tool || (!tool.includes('select') && !tool.startsWith('shape-') && tool !== 'magic-wand' && tool !== 'direct-select')) {
        clearSelection();
      }
      const isPaintTool = tool === 'brush' || tool === 'eraser' || tool === 'magic-wand' || tool === 'bucket';
      if (isPaintTool && !workspace.panels.toolOptions.isVisible) {
          togglePanel('toolOptions', true);
      } else if (!isPaintTool && !workspace.panels.toolOptions.isPinned) {
          togglePanel('toolOptions', false);
      }
  }

  function setActiveShapeTool(shapeType) {
    setActiveTool('shape-draw');
    workspace.shapeDrawing.type = shapeType;
  }

  function drawShapeOnCanvas(ctx, shapeInfo, color, zoom = 1, scale = 1) {
    const { type, startX, startY, endX, endY } = shapeInfo;
    const width = endX - startX;
    const height = endY - startY;
    const centerX = startX + width / 2;
    const centerY = startY + height / 2;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2 / zoom / scale;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();

    switch(type) {
        case 'rectangle':
            ctx.rect(startX, startY, width, height);
            break;
        case 'circle':
            ctx.ellipse(centerX, centerY, Math.abs(width / 2), Math.abs(height / 2), 0, 0, 2 * Math.PI);
            break;
        case 'rhombus':
            ctx.moveTo(centerX, startY);
            ctx.lineTo(endX, centerY);
            ctx.lineTo(centerX, endY);
            ctx.lineTo(startX, centerY);
            ctx.closePath();
            break;
        case 'star':
            const outerRadius = Math.max(Math.abs(width), Math.abs(height)) / 2;
            const innerRadius = outerRadius / 2;
            const spikes = 5;
            let rot = Math.PI / 2 * 3;
            let x = centerX;
            let y = centerY;
            const step = Math.PI / spikes;

            ctx.moveTo(centerX, centerY - outerRadius)
            for (let i = 0; i < spikes; i++) {
                x = centerX + Math.cos(rot) * outerRadius;
                y = centerY + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y)
                rot += step

                x = centerX + Math.cos(rot) * innerRadius;
                y = centerY + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y)
                rot += step
            }
            ctx.closePath();
            break;
    }
    ctx.fill();
  }


  function eraseFromLayer(points) {
    if (!selectedLayer.value) return;
    const layer = selectedLayer.value
    if (layer.image instanceof ImageBitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = layer.image.width;
        canvas.height = layer.image.height;
        canvas.getContext('2d').drawImage(layer.image, 0, 0);
        layer.image = canvas;
    }
    const ctx = layer.image.getContext('2d')
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.globalAlpha = eraser.opacity
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = eraser.size / layer.scale / workspace.zoom;
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath();
    if (points.length < 2) {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.arc(points[0].x, points[0].y, (eraser.size / layer.scale / workspace.zoom) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    }
    ctx.restore()
    layer.version++;
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : null
  }

  function floodFillLayer(startX, startY) {
    if (!selectedLayer.value || !selectedLayer.value.image) return;
    const layer = selectedLayer.value;
    if (layer.image instanceof ImageBitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = layer.image.width;
        canvas.height = layer.image.height;
        canvas.getContext('2d').drawImage(layer.image, 0, 0);
        layer.image = canvas;
    }
    const originalState = getClonedLayerState(layer);
    const canvas = layer.image;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const { width, height } = canvas;
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    const startIndex = (startY * width + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];
    const fillColor = hexToRgb(primaryColor.value);
    if (!fillColor) return;
    if (fillColor.r === startR && fillColor.g === startG && fillColor.b === startB && 255 * brush.opacity === startA) return;
    const pixelStack = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    const tolerance = 30;
    while (pixelStack.length) {
      const [x, y] = pixelStack.pop();
      const currentIndex = (y * width + x);

      if (x < 0 || y < 0 || x >= width || y >= height || visited[currentIndex]) {
          continue;
      }
      visited[currentIndex] = 1;

      const r = data[currentIndex * 4];
      const g = data[currentIndex * 4 + 1];
      const b = data[currentIndex * 4 + 2];
      const a = data[currentIndex * 4 + 3];

      const colorDistance = Math.sqrt(
        (r - startR) ** 2 +
        (g - startG) ** 2 +
        (b - startB) ** 2 +
        (a - startA) ** 2
      );

      if (colorDistance <= tolerance) {
        data[currentIndex * 4] = fillColor.r;
        data[currentIndex * 4 + 1] = fillColor.g;
        data[currentIndex * 4 + 2] = fillColor.b;
        data[currentIndex * 4 + 3] = 255 * brush.opacity;

        pixelStack.push([x + 1, y]);
        pixelStack.push([x - 1, y]);
        pixelStack.push([x, y + 1]);
        pixelStack.push([x, y - 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    layer.version++;
    layerHistoryStore.addLayerState(layer.id, originalState, 'Preenchimento');
    updateLayerThumbnail(layer);
  }

    function getPixel(imageData, x, y) { if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return null; const offset = (y * imageData.width + x) * 4; return imageData.data.slice(offset, offset + 4); }
 function colorDistance(c1, c2) {
  if (!c1 || !c2) return Infinity;
  return Math.sqrt(
    (c1[0] - c2[0]) ** 2 +
    (c1[1] - c2[1]) ** 2 +
    (c1[2] - c2[2]) ** 2 +
    (c1[3] - c2[3]) ** 2
  );
}
    function traceContour(pixelMask, width, height) { const MooreNeighborOffsets = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]]; let startPos = null; for (let i = 0; i < pixelMask.length; i++) { if (pixelMask[i] === 1) { startPos = { x: i % width, y: Math.floor(i / width) }; break; } } if (!startPos) return []; const contour = []; let currentPos = startPos; let dir = 0; do { contour.push(currentPos); let foundNext = false; for (let i = 0; i < 8; i++) { const checkDir = (dir + i) % 8; const neighbor = { x: currentPos.x + MooreNeighborOffsets[checkDir][0], y: currentPos.y + MooreNeighborOffsets[checkDir][1], }; if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height && pixelMask[neighbor.y * width + neighbor.x] === 1) { currentPos = neighbor; dir = (checkDir + 5) % 8; foundNext = true; break; } } if (!foundNext) break; } while (currentPos.x !== startPos.x || currentPos.y !== startPos.y); return contour; }
    function simplifyPath(points, tolerance) { if (points.length < 3) return points; const firstPoint = points[0]; const lastPoint = points[points.length - 1]; let index = -1; let maxDist = 0; for (let i = 1; i < points.length - 1; i++) { const dist = perpendicularDistance(points[i], firstPoint, lastPoint); if (dist > maxDist) { maxDist = dist; index = i; } } if (maxDist > tolerance) { const l1 = simplifyPath(points.slice(0, index + 1), tolerance); const l2 = simplifyPath(points.slice(index), tolerance); return l1.slice(0, l1.length - 1).concat(l2); } else { return [firstPoint, lastPoint]; } }
    function perpendicularDistance(point, lineStart, lineEnd) { let dx = lineEnd.x - lineStart.x; let dy = lineEnd.y - lineStart.y; if (dx === 0 && dy === 0) { dx = point.x - lineStart.x; dy = point.y - lineStart.y; return Math.sqrt(dx * dx + dy * dy); } const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy); const closestPoint = (t < 0) ? lineStart : (t > 1) ? lineEnd : { x: lineStart.x + t * dx, y: lineStart.y + t * dy }; dx = point.x - closestPoint.x; dy = point.y - closestPoint.y; return Math.sqrt(dx * dx + dy * dy); }
async function selectWithMagicWand(startPoint, accumulate = false) {
    if (!selectedLayer.value || !selectedLayer.value.image) return;
    const layer = selectedLayer.value;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    const imageToRead = layer.image;
    tempCanvas.width = imageToRead.width;
    tempCanvas.height = imageToRead.height;
    tempCtx.drawImage(imageToRead, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const canvas = tempCanvas;
    const { data } = imageData;
    const { width, height } = canvas;
    const startX = Math.floor(startPoint.x);
    const startY = Math.floor(startPoint.y);

    if (!accumulate) {
        workspace.magicWand.initialColor = getPixel(imageData, startX, startY);
    }
    const initialColor = workspace.magicWand.initialColor;

    if (!initialColor) {
        if (!accumulate) clearSelection();
        return;
    }

    if (!accumulate || !workspace.magicWand.selectionMask) {
        workspace.magicWand.selectionMask = new Uint8Array(width * height);
    }

    const pixelMask = workspace.magicWand.selectionMask;
    const { tolerance, contiguous } = workspace.magicWand;

    if (contiguous) {
        const queue = [[startX, startY]];
        const visited = new Uint8Array(width * height);
        const [startR, startG, startB, startA] = initialColor;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const idx = y * width + x;

            if (visited[idx] === 1) continue;
            visited[idx] = 1;

            const currentColor = getPixel(imageData, x, y);
            if (currentColor) {
                const [curR, curG, curB, curA] = currentColor;

                const colorDist = Math.sqrt(
                    (curR - startR) ** 2 +
                    (curG - startG) ** 2 +
                    (curB - startB) ** 2 +
                    (curA - startA) ** 2
                );

                if (colorDist <= tolerance) {
                    pixelMask[idx] = 1;

                    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                        const nextX = x + dx, nextY = y + dy;
                        if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
                             const nextIdx = nextY * width + nextX;
                             if (!visited[nextIdx]) {
                                queue.push([nextX, nextY]);
                             }
                        }
                    }
                }
            }
        }
    } else {
      for (let i = 0; i < width * height; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            const currentColor = getPixel(imageData, x, y);
            if (currentColor && colorDistance(initialColor, currentColor) <= tolerance) {
                pixelMask[i] = 1;
            }
        }
    }

    const contour = traceContour(pixelMask, width, height);
    if (contour.length === 0) {
        if (!accumulate) clearSelection();
        return;
    }
    const simplifiedContour = simplifyPath(contour, 1.5);
    const layerToWorkspace = (p) => {
        const localX = p.x - layer.metadata.originalWidth / 2;
        const localY = p.y - layer.metadata.originalHeight / 2;
        const cos = Math.cos(layer.rotation), sin = Math.sin(layer.rotation);
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;
        return { x: rotatedX * layer.scale + layer.x, y: rotatedY * layer.scale + layer.y };
    };
    const contourPoints = simplifiedContour.map(layerToWorkspace);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    contourPoints.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    workspace.lasso.boundingBox = bbox;
    calculateAndUpdateDimensions(bbox.width, bbox.height);
    workspace.lasso.points = contourPoints;
    workspace.lasso.active = true;
    workspace.magicWand.active = true;
}
    async function getLayerBlob(layer) { if (!layer) return null; if (layer.originalFile) { return layer.originalFile; } if (layer.imageUrl) { try { const response = await fetch(layer.imageUrl); if (!response.ok) throw new Error('Network response was not ok.'); return await response.blob(); } catch (error) { console.error(`Erro ao baixar o ficheiro da camada ${layer.name}:`, error); return null; } } return null; }
    function calculateAndUpdateDimensions(widthInWorld, heightInWorld) { const selection = workspace.selection; selection.dimPxW = widthInWorld; selection.dimPxH = heightInWorld; const layer = selectedLayer.value; if (!layer || !layer.metadata.dpi) { selection.dimCmW = 0; selection.dimCmH = 0; return; } const selectionWidthInLayerPx = widthInWorld / layer.scale; const selectionHeightInLayerPx = heightInWorld / layer.scale; const pxToCm = 2.54 / layer.metadata.dpi; selection.dimCmW = selectionWidthInLayerPx * pxToCm; selection.dimCmH = selectionHeightInLayerPx * pxToCm; }
    function startLasso(worldPoint) { workspace.lasso.active = true; workspace.lasso.points = [worldPoint]; workspace.lasso.boundingBox = { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 }; calculateAndUpdateDimensions(0, 0); }
    function updateLasso(worldPoint) { if (!workspace.lasso.active) return; workspace.lasso.points.push(worldPoint); const { points } = workspace.lasso; let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y; for (let i = 1; i < points.length; i++) { minX = Math.min(minX, points[i].x); maxX = Math.max(maxX, points[i].x); minY = Math.min(minY, points[i].y); maxY = Math.max(maxY, points[i].y); } const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }; workspace.lasso.boundingBox = bbox; calculateAndUpdateDimensions(bbox.width, bbox.height); }
    function endLasso(mousePosition) { workspace.lasso.active = false; if (workspace.viewMode === 'edit' && workspace.lasso.points.length > 2) { showSelectionContextMenu(true, mousePosition); } }
    function startSelection(worldMouse) { workspace.selection.active = true; workspace.selection.startX = worldMouse.x; workspace.selection.startY = worldMouse.y; workspace.selection.endX = worldMouse.x; workspace.selection.endY = worldMouse.y; updateSelection(worldMouse); }
    function updateSelection(worldMouse) { if (!workspace.selection.active) return; const sel = workspace.selection; sel.endX = worldMouse.x; sel.endY = worldMouse.y; sel.width = Math.abs(sel.startX - sel.endX); sel.height = Math.abs(sel.startY - sel.endY); calculateAndUpdateDimensions(sel.width, sel.height); }
    function endSelection(mousePosition) { workspace.selection.active = false; if (workspace.viewMode === 'edit' && workspace.selection.width > 0 && workspace.selection.height > 0) { showSelectionContextMenu(true, mousePosition); } }
    function clearSelection() { workspace.selection.active = false; workspace.selection.width = 0; workspace.selection.height = 0; workspace.lasso.points = []; workspace.lasso.active = false; workspace.isSelectionContextMenuVisible = false; workspace.magicWand.active = false; workspace.magicWand.selectionMask = null; workspace.magicWand.initialColor = null; }
    function addLayer(assetData, type) { const url = getSupabaseImageUrl(`${type}s`, assetData.file_path); processAndAddLayer({ name: assetData.name || 'Nova Camada', type: type, imageUrl: url, metadata: assetData.metadata || { dpi: 96 }, }); }
    async function addLocalLayer(file, type) { processAndAddLayer({ name: file.name, type: type, file: file }); }

  function updateLayerProperties(id, properties) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      layers.value[index] = { ...layers.value[index], ...properties }
      layers.value[index].version++;
    }
  }

  function resizeMockup(newWidthPx, newHeightPx) {
    if (!mockupLayer.value) return;
    const originalState = getClonedLayerState(mockupLayer.value);
    const newScale = newWidthPx / mockupLayer.value.metadata.originalWidth;
    updateLayerProperties(mockupLayer.value.id, { scale: newScale });
    layerHistoryStore.addLayerState(mockupLayer.value.id, originalState, 'Redimensionar Mockup');
    globalHistoryStore.addState(getClonedGlobalState(), 'Redimensionar Documento');
    workspace.document.width = newWidthPx;
    workspace.document.height = newHeightPx;
  }

function showContextMenu(visible, position = { x: 0, y: 0 }, targetId = null, isFolder = false) {
      if (visible) {
        const menuWidth = 260;
        const estimatedMenuHeight = 450;
        const margin = 10;

        const { innerWidth, innerHeight } = window;

        let x = position.x;
        let y = position.y;
        let fromBottom = false;

        if (x + menuWidth + margin > innerWidth) {
          x = innerWidth - menuWidth - margin;
        }
        if (x < margin) {
          x = margin;
        }

        if (y + estimatedMenuHeight > innerHeight) {
            fromBottom = true;
            y = innerHeight - position.y;
        }


        workspace.contextMenuPosition = { x, y, fromBottom };
        workspace.contextMenuTargetId = targetId;
        workspace.contextMenuIsFolder = isFolder;
        if (targetId && !isFolder) {
          selectLayer(targetId);
        }
      }
      workspace.isContextMenuVisible = visible;
    }
    function showSelectionContextMenu(visible, position = { x: 0, y: 0 }) { workspace.isSelectionContextMenuVisible = visible; workspace.selectionContextMenuPosition = position; }
    function showResizeModal(visible) { workspace.isResizeModalVisible = visible; }
    function frameLayer(layerId) { const layer = layers.value.find((l) => l.id === layerId); const canvasEl = document.getElementById('mainCanvas'); if (!layer || !canvasEl || !layer.metadata.originalWidth && !layer.pathData) return; const padding = 0.8; const layerWidth = layer.metadata.originalWidth * layer.scale; const layerHeight = layer.metadata.originalHeight * layer.scale; const zoomX = (canvasEl.clientWidth * padding) / layerWidth; const zoomY = (canvasEl.clientHeight * padding) / layerHeight; const newZoom = Math.min(zoomX, zoomY, 2); workspace.zoom = newZoom; workspace.pan.x = canvasEl.clientWidth / 2 - layer.x * newZoom; workspace.pan.y = canvasEl.clientHeight / 2 - layer.y * newZoom; }
    function setRulerUnit(unit) { workspace.rulers.unit = unit; }
    function togglePreviewInteractivity() { workspace.previewIsInteractive = !workspace.previewIsInteractive; if (!workspace.previewIsInteractive) endLasso(); }
    function setPreviewZoom(zoom) { workspace.previewZoom = zoom; }
    function selectLayer(id) {
        if (activeTool.value === 'direct-select' && editingVector.layerId !== id) {
            exitVectorEditMode();
        }
        selectedLayerId.value = id;
    }
    function startLayerResize(mousePos, initialScale) { if (!selectedLayer.value) return; workspace.transformStart.mousePos = mousePos; workspace.transformStart.scale = initialScale; workspace.transformStart.layerCenter = { x: selectedLayer.value.x, y: selectedLayer.value.y }; }
    function updateLayerResize(mousePos) {
    if (!selectedLayer.value) return;
    const { transformStart, pan, zoom } = workspace;
    const layer = selectedLayer.value;
    const centerScreenX = transformStart.layerCenter.x * zoom + pan.x;
    const centerScreenY = transformStart.layerCenter.y * zoom + pan.y;
    const initialDx = transformStart.mousePos.x - centerScreenX;
    const initialDy = transformStart.mousePos.y - centerScreenY;
    const initialDist = Math.sqrt(initialDx * initialDx + initialDy * initialDy);

    const currentDx = mousePos.x - centerScreenX;
    const currentDy = mousePos.y - centerScreenY;

    const currentDist = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
    if (initialDist === 0) return;
    const scaleFactor = currentDist / initialDist;
    const newScale = transformStart.scale * scaleFactor;
    updateLayerProperties(layer.id, { scale: Math.max(0.01, newScale) });
}
    function startLayerRotation(startAngle) { if (!selectedLayer.value) return; workspace.transformStart.rotation = startAngle; workspace.transformStart.layerRotation = selectedLayer.value.rotation; }
    function updateLayerRotation(currentAngle) { if (!selectedLayer.value) return; const { transformStart } = workspace; const angleDiff = currentAngle - transformStart.rotation; updateLayerProperties(selectedLayer.value.id, { rotation: transformStart.layerRotation + angleDiff }); }
    function deleteLayer(id) { const index = layers.value.findIndex((l) => l.id === id); if (index > -1) { globalHistoryStore.addState(getClonedGlobalState(), `Apagar Camada: ${layers.value[index].name}`); const layerToDelete = layers.value[index]; if (layerToDelete.imageUrl && layerToDelete.imageUrl.startsWith('blob:')) { URL.revokeObjectURL(layerToDelete.imageUrl); } layers.value.splice(index, 1); layerHistoryStore.clearLayerHistory(id); if (selectedLayerId.value === id) { selectedLayerId.value = layers.value.length > 0 ? layers.value[Math.min(index, layers.value.length - 1)].id : null; } } }
    function bringForward(id) { const index = layers.value.findIndex((l) => l.id === id); if (index < layers.value.length - 1) { globalHistoryStore.addState(getClonedGlobalState(), 'Trazer para a Frente'); const layer = layers.value.splice(index, 1)[0]; layers.value.splice(index + 1, 0, layer); } }
    function sendBackward(id) { const index = layers.value.findIndex((l) => l.id === id); if (index > 0) { globalHistoryStore.addState(getClonedGlobalState(), 'Enviar para Trás'); const layer = layers.value.splice(index, 1)[0]; layers.value.splice(index - 1, 0, layer); } }
    function moveLayer(fromIndex, toIndex) { globalHistoryStore.addState(getClonedGlobalState(), 'Mover Camada'); const [movedLayer] = layers.value.splice(fromIndex, 1); layers.value.splice(toIndex, 0, movedLayer); }
    function toggleViewMode() { workspace.viewMode = workspace.viewMode === 'edit' ? 'preview' : 'edit'; if (workspace.viewMode === 'edit' && selectedLayer.value) { frameLayer(selectedLayer.value.id); } }
    function getSupabaseImageUrl(bucket, path) { if (!bucket || !path) return null; const { data } = supabase.storage.from(bucket).getPublicUrl(path); return data.publicUrl; }
    function updateWorkspace(properties) { Object.assign(workspace, properties); }
    function showPreviewSidebar(visible) { workspace.isPreviewSidebarVisible = visible; }
    function showSignatureModal(visible) { workspace.isSignatureModalVisible = visible; }

  function updateLayerAdjustments(layerId, newAdjustments) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (layer) {
      const originalState = getClonedLayerState(layer);
      layer.adjustments = { ...layer.adjustments, ...newAdjustments }
      layerHistoryStore.addLayerState(layer.id, originalState, 'Ajuste de Imagem');
      updateLayerThumbnail(layer);
    }
  }

    function flipLayer(axis) { if (!selectedLayer.value) return; const prop = axis === 'horizontal' ? 'flipH' : 'flipV'; const currentFlip = selectedLayer.value.adjustments[prop]; updateLayerAdjustments(selectedLayer.value.id, { [prop]: !currentFlip }); }
    function rotateLayer(degrees) { if (!selectedLayer.value) return; const originalState = getClonedLayerState(selectedLayer.value); const newRotation = selectedLayer.value.rotation + (degrees * Math.PI) / 180; updateLayerProperties(selectedLayer.value.id, { rotation: newRotation }); layerHistoryStore.addLayerState(selectedLayer.value.id, originalState, 'Rodar 90°'); updateLayerThumbnail(selectedLayer.value); }
    function duplicateLayer(layerId) {
      const sourceLayer = layers.value.find((l) => l.id === layerId);
      if (!sourceLayer) return null;

      globalHistoryStore.addState(getClonedGlobalState(), 'Duplicar Camada');

      const newLayerData = reactive({
        ...JSON.parse(JSON.stringify(sourceLayer)),
        id: uuidv4(),
        name: `${sourceLayer.name} Cópia`,
        x: sourceLayer.x + 20,
        y: sourceLayer.y + 20,
        image: null,
        version: 1,
      });

      if (sourceLayer.image) {
          const newCanvas = document.createElement('canvas');
          newCanvas.width = sourceLayer.image.width;
          newCanvas.height = sourceLayer.image.height;
          newCanvas.getContext('2d').drawImage(sourceLayer.image, 0, 0);
          newLayerData.image = newCanvas;
      }

      newLayerData.fullResImage = sourceLayer.fullResImage;
      newLayerData.lowResProxy = sourceLayer.lowResProxy;
      newLayerData.originalFile = sourceLayer.originalFile;
      newLayerData.imageUrl = sourceLayer.imageUrl;

      const sourceIndex = layers.value.findIndex((l) => l.id === layerId);
      layers.value.splice(sourceIndex + 1, 0, newLayerData);

      layerHistoryStore.addLayerState(newLayerData.id, getClonedLayerState(newLayerData), 'Criação da Camada');
      selectLayer(newLayerData.id);
      return newLayerData;
    }

  async function mergeDown(layerId) {
    const topLayerIndex = layers.value.findIndex(l => l.id === layerId);
    if (topLayerIndex <= 0) return;

    globalHistoryStore.addState(getClonedGlobalState(), 'Mesclar para Baixo');

    const topLayer = layers.value[topLayerIndex];
    const bottomLayer = layers.value[topLayerIndex - 1];

    if (!topLayer.image || !bottomLayer.image) return;

    const getCanvasFromImage = (image) => {
        if (image instanceof HTMLCanvasElement) return image;
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas;
    };

    const topCanvas = getCanvasFromImage(topLayer.image);
    const bottomCanvas = getCanvasFromImage(bottomLayer.image);

    const originalBottomState = getClonedLayerState(bottomLayer);

    const topWidth = topLayer.metadata.originalWidth * topLayer.scale;
    const topHeight = topLayer.metadata.originalHeight * topLayer.scale;
    const bottomWidth = bottomLayer.metadata.originalWidth * bottomLayer.scale;
    const bottomHeight = bottomLayer.metadata.originalHeight * bottomLayer.scale;

    const topHalfW = topWidth / 2;
    const topHalfH = topHeight / 2;
    const bottomHalfW = bottomWidth / 2;
    const bottomHalfH = bottomHeight / 2;

    const minX = Math.min(bottomLayer.x - bottomHalfW, topLayer.x - topHalfW);
    const minY = Math.min(bottomLayer.y - bottomHalfH, topLayer.y - topHalfH);
    const maxX = Math.max(bottomLayer.x + bottomHalfW, topLayer.x + topHalfW);
    const maxY = Math.max(bottomLayer.y + bottomHalfH, topLayer.y + topHalfH);

    const newWidth = maxX - minX;
    const newHeight = maxY - minY;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.save();
    tempCtx.translate(bottomLayer.x - minX, bottomLayer.y - minY);
    tempCtx.rotate(bottomLayer.rotation);
    tempCtx.scale(bottomLayer.scale, bottomLayer.scale);
    tempCtx.drawImage(bottomCanvas, -bottomLayer.metadata.originalWidth / 2, -bottomLayer.metadata.originalHeight / 2);
    tempCtx.restore();

    tempCtx.save();
    tempCtx.globalAlpha = topLayer.opacity;
    tempCtx.translate(topLayer.x - minX, topLayer.y - minY);
    tempCtx.rotate(topLayer.rotation);
    tempCtx.scale(topLayer.scale, topLayer.scale);
    tempCtx.drawImage(topCanvas, -topLayer.metadata.originalWidth / 2, -topLayer.metadata.originalHeight / 2);
    tempCtx.restore();

    bottomLayer.image = tempCanvas;
    bottomLayer.metadata.originalWidth = newWidth;
    bottomLayer.metadata.originalHeight = newHeight;
    bottomLayer.x = minX + newWidth / 2;
    bottomLayer.y = minY + newHeight / 2;
    bottomLayer.scale = 1;
    bottomLayer.rotation = 0;

    bottomLayer.fullResImage = await createImageBitmap(tempCanvas);
    const LOW_RES_PROXY_SIZE = 1000;
    const lowResRatio = Math.min(LOW_RES_PROXY_SIZE / newWidth, LOW_RES_PROXY_SIZE / newHeight, 1);
    bottomLayer.lowResProxy = await createImageBitmap(tempCanvas, {
        resizeWidth: Math.round(newWidth * lowResRatio),
        resizeHeight: Math.round(newHeight * lowResRatio),
        resizeQuality: 'low',
    });
    bottomLayer.image = bottomLayer.fullResImage;

    bottomLayer.version++;
    layerHistoryStore.addLayerState(bottomLayer.id, originalBottomState, 'Mesclar Camada');
    updateLayerThumbnail(bottomLayer);

    layers.value.splice(topLayerIndex, 1);
    layerHistoryStore.clearLayerHistory(layerId);
    selectLayer(bottomLayer.id);
  }

    function createImageFromSelection(sourceLayer, deleteFromOriginal = false) { if (!sourceLayer || !isSelectionActive.value) return null; const originalState = getClonedLayerState(sourceLayer); const sourceImage = sourceLayer.fullResImage || sourceLayer.image; const path = new Path2D(); const selectionPoints = workspace.lasso.points.length > 2 ? workspace.lasso.points : [ { x: workspace.selection.startX, y: workspace.selection.startY }, { x: workspace.selection.endX, y: workspace.selection.startY }, { x: workspace.selection.endX, y: workspace.selection.endY }, { x: workspace.selection.startX, y: workspace.selection.endY }, ]; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; selectionPoints.forEach((p, index) => { const workspaceX = p.x; const workspaceY = p.y; const cos = Math.cos(-sourceLayer.rotation); const sin = Math.sin(-sourceLayer.rotation); const dx = (workspaceX - sourceLayer.x) / sourceLayer.scale; const dy = (workspaceY - sourceLayer.y) / sourceLayer.scale; const layerX = dx * cos - dy * sin + sourceLayer.metadata.originalWidth / 2; const layerY = dx * sin + dy * cos + sourceLayer.metadata.originalHeight / 2; if (index === 0) path.moveTo(layerX, layerY); else path.lineTo(layerX, layerY); minX = Math.min(minX, layerX); minY = Math.min(minY, layerY); maxX = Math.max(maxX, layerX); maxY = Math.max(maxY, layerY); }); path.closePath(); const trimWidth = maxX - minX; const trimHeight = maxY - minY; if (trimWidth <= 0 || trimHeight <= 0) return null; const trimmedCanvas = document.createElement('canvas'); trimmedCanvas.width = trimWidth; trimmedCanvas.height = trimHeight; const trimmedCtx = trimmedCanvas.getContext('2d'); trimmedCtx.translate(-minX, -minY); trimmedCtx.clip(path); trimmedCtx.drawImage(sourceImage, 0, 0); if (deleteFromOriginal) { if (sourceLayer.image instanceof ImageBitmap) { const canvas = document.createElement('canvas'); canvas.width = sourceLayer.image.width; canvas.height = sourceLayer.image.height; canvas.getContext('2d').drawImage(sourceLayer.image, 0, 0); sourceLayer.image = canvas; } const originalCtx = sourceLayer.image.getContext('2d'); if (originalCtx) { originalCtx.save(); originalCtx.globalCompositeOperation = 'destination-out'; originalCtx.fill(path); originalCtx.restore(); sourceLayer.version++; layerHistoryStore.addLayerState(sourceLayer.id, originalState, 'Recortar Seleção'); updateLayerThumbnail(sourceLayer) } } return { imageDataUrl: trimmedCanvas.toDataURL(), width: trimWidth, height: trimHeight, }; }
    function getSelectionBoundingBoxCenter() { if (workspace.lasso.points.length > 2) { const bbox = workspace.lasso.boundingBox; return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }; } if (workspace.selection.width > 0) { const sel = workspace.selection; return { x: Math.min(sel.startX, sel.endX) + sel.width / 2, y: Math.min(sel.startY, sel.endY) + sel.height / 2 }; } return selectedLayer.value ? { x: selectedLayer.value.x, y: selectedLayer.value.y } : { x: 0, y: 0 }; }
    function copySelectionToClipboard() { if (!selectedLayer.value || !isSelectionActive.value) return; const selectionData = createImageFromSelection(selectedLayer.value, false); if (selectionData) { copiedSelection.value = { ...selectionData, metadata: selectedLayer.value.metadata, }; } clearSelection(); }
    function pasteSelection() { if (!copiedSelection.value) return; globalHistoryStore.addState(getClonedGlobalState(), 'Colar Seleção'); processAndAddLayer({ name: 'Seleção Colada', type: 'pattern', imageUrl: copiedSelection.value.imageDataUrl, metadata: { dpi: copiedSelection.value.metadata.dpi || 96, originalWidth: copiedSelection.value.width, originalHeight: copiedSelection.value.height, }, initialPosition: { x: workspace.document.width / 2, y: workspace.document.height / 2 }, }); }
    function duplicateSelection() {
      if (!selectedLayer.value || !isSelectionActive.value) return;
      globalHistoryStore.addState(getClonedGlobalState(), 'Duplicar Seleção');
      const selectionData = createImageFromSelection(selectedLayer.value, false);
      if (selectionData) {
        const center = getSelectionBoundingBoxCenter();
        processAndAddLayer({
          name: `${selectedLayer.value.name} Cópia`,
          type: selectedLayer.value.type,
          imageUrl: selectionData.imageDataUrl,
          metadata: {
            dpi: selectedLayer.value.metadata.dpi,
            originalWidth: selectionData.width,
            originalHeight: selectionData.height,
          },
          initialPosition: center,
          initialScale: selectedLayer.value.scale,
        });
      }
      clearSelection();
    }
    function cutoutSelection() { if (!selectedLayer.value || !isSelectionActive.value) return; globalHistoryStore.addState(getClonedGlobalState(), 'Recortar para Nova Camada'); const selectionData = createImageFromSelection(selectedLayer.value, true); if (selectionData) { const center = getSelectionBoundingBoxCenter(); processAndAddLayer({ name: `${selectedLayer.value.name} Recorte`, type: selectedLayer.value.type, imageUrl: selectionData.imageDataUrl, metadata: { dpi: selectedLayer.value.metadata.dpi, originalWidth: selectionData.width, originalHeight: selectionData.height, }, initialPosition: center, initialScale: selectedLayer.value.scale }); } clearSelection(); }
    function setBrushOption(option, value) {
        if (brush.hasOwnProperty(option)) {
            brush[option] = value;
        }
    }
    function setEraserOption(option, value) { eraser[option] = value; }
    function setPrimaryColor(color) { primaryColor.value = color; }

  function undoLastAction() {
    if (selectedLayer.value) {
        layerHistoryStore.undo(selectedLayer.value.id);
    } else {
        globalHistoryStore.undo();
    }
  }

  function updateLayerFromHistory(layerId, stateToRestore) {
      const layer = layers.value.find(l => l.id === layerId);
      if (layer && stateToRestore) {
          if (stateToRestore.type === 'vector') {
              Object.assign(layer, stateToRestore);
              layer.version++;
              updateLayerThumbnail(layer);
              return;
          }
          const { imageDataUrl, ...otherProps } = stateToRestore;
          Object.assign(layer, otherProps);
          if (imageDataUrl) {
              const img = new Image();
              img.onload = async () => {
                  layer.image = await createImageBitmap(img);
                  layer.version++;
                  updateLayerThumbnail(layer);
              };
              img.src = imageDataUrl;
          }
      }
  }

  async function setGlobalState(stateToRestore) {
      layers.value.forEach(layer => {
          if (layer.imageUrl && layer.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(layer.imageUrl);
          }
      });
      const newLayers = [];
      for (const layerState of stateToRestore.layersWithImage) {
          const newLayer = createLayerObject(layerState.name, layerState.type, layerState.imageUrl, layerState.metadata);
          const { imageDataUrl, ...otherProps } = layerState;
          Object.assign(newLayer, otherProps);

          if (layerState.type === 'vector') {
              newLayers.push(newLayer);
              continue;
          }

          try {
              const img = new Image();
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageDataUrl;
              });
              newLayer.image = await createImageBitmap(img);
              newLayer.fullResImage = newLayer.image;
              updateLayerThumbnail(newLayer);
              newLayers.push(newLayer);
          } catch (error) {
              console.error(`Erro ao recarregar a imagem para a camada ${newLayer.name} a partir do histórico:`, error);
          }
      }
      layers.value = newLayers;
      Object.assign(workspace, stateToRestore.workspace);
      selectedLayerId.value = stateToRestore.workspace.selectedLayerId || null;
  }

  function setTransformingState(isTransforming) {
    workspace.isTransforming = isTransforming;
  }

 function createBlankCanvas({ name, width, height, unit, dpi }) {
    layers.value = [];
    selectedLayerId.value = null;
    globalHistoryStore.clearHistory();

    Object.assign(workspace, {
        pan: { x: 0, y: 0 },
        zoom: 1,
        viewMode: 'edit',
        rulers: { visible: true, unit: 'cm' },
        grid: { visible: true },
    });


    let widthInPx = width;
    let heightInPx = height;
    const pxPerCm = dpi / 2.54;
    const pxPerIn = dpi;

    if (unit === 'cm') {
      widthInPx = Math.round(width * pxPerCm);
      heightInPx = Math.round(height * pxPerCm);
    } else if (unit === 'in') {
      widthInPx = Math.round(width * pxPerIn);
      heightInPx = Math.round(height * pxPerIn);
    }

    workspace.document.width = widthInPx;
    workspace.document.height = heightInPx;

    const canvas = document.createElement('canvas');
    canvas.width = widthInPx;
    canvas.height = heightInPx;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, widthInPx, heightInPx);

    processAndAddLayer({
      name: name || "Fundo",
      type: 'mockup',
      imageUrl: canvas.toDataURL(),
      metadata: {
        dpi: dpi,
        originalWidth: widthInPx,
        originalHeight: heightInPx,
      },
    });
  }

  function rasterizeVectorLayer(layerId) {
    const layer = layers.value.find((l) => l.id === layerId);
    if (!layer || layer.type !== 'vector') {
      alert('Apenas camadas de vetor podem ser rasterizadas.');
      return;
    }
    globalHistoryStore.addState(getClonedGlobalState(), 'Rasterizar Camada');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2;
    canvas.width = layer.metadata.originalWidth * scale;
    canvas.height = layer.metadata.originalHeight * scale;
    const path = new Path2D(layer.pathData);
    ctx.scale(scale, scale);
    ctx.strokeStyle = primaryColor.value;
    ctx.lineWidth = (layer.strokeWidth || 2);
    ctx.stroke(path);
    processAndAddLayer({
      name: `${layer.name} (Rasterizado)`,
      type: 'pattern',
      imageUrl: canvas.toDataURL(),
      metadata: {
        dpi: layer.metadata.dpi || 96,
        originalWidth: canvas.width,
        originalHeight: canvas.height,
      },
      initialPosition: { x: layer.x, y: layer.y },
      initialScale: layer.scale,
    });
    deleteLayer(layerId);
  }

  function exportLayer(layerId, format = 'png', quality = 0.95) {
    const layer = layers.value.find((l) => l.id === layerId);
    if (!layer) {
      alert('Camada não encontrada.');
      return;
    }
    if (layer.type === 'vector') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 3;
        canvas.width = layer.metadata.originalWidth * layer.scale * scale;
        canvas.height = layer.metadata.originalHeight * layer.scale * scale;
        const path = new Path2D(layer.pathData);
        ctx.scale(layer.scale * scale, layer.scale * scale);
        ctx.strokeStyle = primaryColor.value;
        ctx.lineWidth = (layer.strokeWidth || 2);
        ctx.stroke(path);
        const mimeType = `image/${format}`;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const link = document.createElement('a');
        link.download = `${layer.name}.${format}`;
        link.href = dataUrl;
        link.click();
        return;
    }
    if (!layer.image) {
      alert('A camada de imagem está vazia.');
      return;
    }

    const imageToExport = layer.fullResImage || layer.image;
    const finalWidth = Math.round(layer.metadata.originalWidth * layer.scale);
    const finalHeight = Math.round(layer.metadata.originalHeight * layer.scale);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = finalWidth;
    exportCanvas.height = finalHeight;
    const exportCtx = exportCanvas.getContext('2d');

    const adj = layer.adjustments;
    exportCtx.filter = [
      `grayscale(${adj.grayscale || 0}%)`, `sepia(${adj.sepia || 0}%)`,
      `saturate(${adj.saturate || 100}%)`, `contrast(${adj.contrast || 100}%)`,
      `brightness(${adj.brightness || 100}%)`, `invert(${adj.invert || 0}%)`
    ].join(' ');

    exportCtx.translate(finalWidth / 2, finalHeight / 2);
    exportCtx.rotate(layer.rotation);
    const scaleX = adj.flipH ? -1 : 1;
    const scaleY = adj.flipV ? -1 : 1;
    exportCtx.scale(scaleX, scaleY);
    exportCtx.drawImage(imageToExport, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);

    const mimeType = `image/${format}`;
    const dataUrl = exportCanvas.toDataURL(mimeType, quality);
    const link = document.createElement('a');
    link.download = `${layer.name}.${format}`;
    link.href = dataUrl;
    link.click();
  }

  async function exportDrawnArea() {
    const drawingLayer = selectedLayer.value;
    if (!drawingLayer || (drawingLayer.type !== 'drawing' && drawingLayer.type !== 'pattern')) {
        alert('Por favor, selecione uma camada com conteúdo desenhado para usar esta função.');
        return;
    }

    const imageToScan = drawingLayer.fullResImage || drawingLayer.image;
    if (!imageToScan) {
        alert('A camada selecionada está vazia.');
        return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageToScan.width;
    tempCanvas.height = imageToScan.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(imageToScan, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    let minX = tempCanvas.width, minY = tempCanvas.height, maxX = -1, maxY = -1;

    for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
            const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX === -1) {
        alert('Não foi encontrado nenhum desenho na camada selecionada.');
        return;
    }

    const drawnWidth = maxX - minX + 1;
    const drawnHeight = maxY - minY + 1;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = drawnWidth;
    exportCanvas.height = drawnHeight;
    const exportCtx = exportCanvas.getContext('2d');

    for (const layer of layers.value) {
        if (!layer.visible || !layer.image) continue;

        exportCtx.save();

        const adj = layer.adjustments;
        exportCtx.filter = [
            `grayscale(${adj.grayscale || 0}%)`, `sepia(${adj.sepia || 0}%)`,
            `saturate(${adj.saturate || 100}%)`, `contrast(${adj.contrast || 100}%)`,
            `brightness(${adj.brightness || 100}%)`, `invert(${adj.invert || 0}%)`
        ].join(' ');

        const relativeX = layer.x - (drawingLayer.x - drawingLayer.metadata.originalWidth / 2 + minX);
        const relativeY = layer.y - (drawingLayer.y - drawingLayer.metadata.originalHeight / 2 + minY);

        exportCtx.translate(relativeX, relativeY);
        exportCtx.rotate(layer.rotation);
        exportCtx.scale(layer.scale, layer.scale);
        exportCtx.globalAlpha = layer.opacity;

        exportCtx.drawImage(
            layer.fullResImage || layer.image,
            -layer.metadata.originalWidth / 2,
            -layer.metadata.originalHeight / 2,
            layer.metadata.originalWidth,
            layer.metadata.originalHeight
        );

        exportCtx.restore();
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${drawingLayer.name}_export.png`;
    link.href = dataUrl;
    link.click();
}

  function createFolder(name = 'Nova Pasta') {
    const newFolder = reactive({
      id: uuidv4(),
      name,
      type: 'folder',
      isOpen: true,
      isLocked: false,
      layerIds: [],
    });
    folders.value.push(newFolder);
    globalHistoryStore.addState(getClonedGlobalState(), 'Criar Pasta');
    return newFolder;
  }

  function renameFolder(folderId, newName) {
    const folder = folders.value.find(f => f.id === folderId);
    if (folder && newName) {
      folder.name = newName;
    }
  }

  function deleteFolder(folderId) {
    const folderIndex = folders.value.findIndex(f => f.id === folderId);
    if (folderIndex > -1) {
      const folder = folders.value[folderIndex];
      folder.layerIds.forEach(layerId => {
        const layer = layers.value.find(l => l.id === layerId);
        if (layer) layer.folderId = null;
      });
      folders.value.splice(folderIndex, 1);
      globalHistoryStore.addState(getClonedGlobalState(), 'Excluir Pasta');
    }
  }

  function toggleFolderLock(folderId) {
    const folder = folders.value.find(f => f.id === folderId);
    if (folder) {
      folder.isLocked = !folder.isLocked;
    }
  }

  function toggleFolderVisibility(folderId) {
    const folder = folders.value.find(f => f.id === folderId);
    if (folder) {
        const visibleLayers = folder.layerIds.map(id => layers.value.find(l => l.id === id)).filter(l => l && l.visible);
        const shouldBeVisible = visibleLayers.length < folder.layerIds.length / 2;
        folder.layerIds.forEach(layerId => {
            updateLayerProperties(layerId, { visible: shouldBeVisible });
        });
    }
}


  function moveLayerToFolder(layerId, folderId) {
    const layer = layers.value.find(l => l.id === layerId);
    if (!layer) return;

    if (layer.folderId) {
        const oldFolder = folders.value.find(f => f.id === layer.folderId);
        if (oldFolder) {
            oldFolder.layerIds = oldFolder.layerIds.filter(id => id !== layerId);
        }
    }

    layer.folderId = folderId;

    if (folderId) {
        const targetFolder = folders.value.find(f => f.id === folderId);
        if (targetFolder && !targetFolder.layerIds.includes(layerId)) {
            targetFolder.layerIds.push(layerId);
        }
    }

    globalHistoryStore.addState(getClonedGlobalState(), 'Mover Camada para Pasta');
  }

  function duplicateFolder(folderId) {
    const sourceFolder = folders.value.find(f => f.id === folderId);
    if (!sourceFolder) return;

    const newFolder = createFolder(`${sourceFolder.name} Cópia`);

    const layersToDuplicate = sourceFolder.layerIds.map(id => layers.value.find(l => l.id === id)).filter(Boolean);

    layersToDuplicate.forEach(layer => {
        const newLayer = duplicateLayer(layer.id);
        if (newLayer) {
            moveLayerToFolder(newLayer.id, newFolder.id);
        }
    });
}
function createDrawingLayer() {
    const newLayer = createLayerObject('Camada de Desenho', 'drawing', null, {
        originalWidth: workspace.document.width,
        originalHeight: workspace.document.height,
    });
    const canvas = document.createElement('canvas');
    canvas.width = workspace.document.width;
    canvas.height = workspace.document.height;
    newLayer.image = canvas;
    newLayer.fullResImage = canvas;
    newLayer.x = workspace.document.width / 2;
    newLayer.y = workspace.document.height / 2;

    layers.value.push(newLayer);
    selectLayer(newLayer.id);
    layerHistoryStore.addLayerState(newLayer.id, getClonedLayerState(newLayer), 'Criação da Camada de Desenho');
    globalHistoryStore.addState(getClonedGlobalState(), 'Adicionar Camada de Desenho');
    return newLayer;
}

  // --- NOVA FUNÇÃO PARA AJUSTAR A BOUNDING BOX DAS FORMAS ---
  function trimLayerToObjectBounds(layerId) {
    const layer = layers.value.find(l => l.id === layerId);
    if (!layer || !layer.image) return;

    const canvas = layer.image;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX === -1) {
        deleteLayer(layerId);
        return;
    }

    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    trimmedCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

    const worldCenterX = layer.x - (canvas.width / 2) + (minX + trimmedWidth / 2);
    const worldCenterY = layer.y - (canvas.height / 2) + (minY + trimmedHeight / 2);

    layer.image = trimmedCanvas;
    layer.fullResImage = trimmedCanvas;
    layer.metadata.originalWidth = trimmedWidth;
    layer.metadata.originalHeight = trimmedHeight;
    layer.x = worldCenterX;
    layer.y = worldCenterY;

    updateLayerThumbnail(layer);
    layer.version++;
  }

async function vectorizeLayer(layerId) {
    console.log('%c[canvasStore] Iniciando vetorização com servidor Python...', 'color: #28a745; font-weight: bold;');

    const sourceLayer = layers.value.find(l => l.id === layerId);
    if (!sourceLayer || !sourceLayer.image) {
        alert('Camada de origem não encontrada ou vazia.');
        return;
    }

    workspace.isVectorizing = true;

    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceLayer.image.width;
        tempCanvas.height = sourceLayer.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(sourceLayer.image, 0, 0);
        const imageDataUrl = tempCanvas.toDataURL('image/png');

        const functionUrl = import.meta.env.VITE_RENDER_VECTORIZER_URL || '';
        if (!functionUrl) throw new Error("URL do servidor Python não configurada.");

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ detail: `Erro no servidor Python: ${response.statusText}` }));
            throw new Error(errorBody.detail);
        }

        const vectorData = await response.json();
        if (!Array.isArray(vectorData)) {
            throw new Error("A resposta da vetorização não foi um array válido.");
        }

        if (vectorData.length === 0) {
           alert("Nenhuma forma foi encontrada na imagem para vetorizar.");
           return;
        }

        const vectorFolder = createFolder(sourceLayer.name + ' (Vetorizado)');

        vectorData.forEach((vector, index) => {
            const { path, bbox } = vector;

            const newLayer = createLayerObject(
                `${sourceLayer.name} Vetor ${index + 1}`,
                'vector',
                null,
                {
                    originalWidth: bbox.width,
                    originalHeight: bbox.height,
                    pathData: path
                }
            );

            newLayer.x = sourceLayer.x - (sourceLayer.metadata.originalWidth / 2) + bbox.x + (bbox.width / 2);
            newLayer.y = sourceLayer.y - (sourceLayer.metadata.originalHeight / 2) + bbox.y + (bbox.height / 2);

            newLayer.scale = sourceLayer.scale;
            newLayer.rotation = sourceLayer.rotation;

            layers.value.push(newLayer);
            moveLayerToFolder(newLayer.id, vectorFolder.id);
        });

        if (layers.value.length > 0) {
            selectLayer(layers.value[layers.value.length - 1].id);
        }

        globalHistoryStore.addState(getClonedGlobalState(), 'Vetorizar ' + sourceLayer.name);

        console.log(`%c[canvasStore] ${vectorData.length} camadas de vetor criadas com sucesso!`, 'color: #28a745; font-weight: bold;');

    } catch (error) {
        console.error('%c[canvasStore] FALHA AO VETORIZAR:', 'color: #ff0000; font-weight: bold;', error);
        alert('Ocorreu um erro durante a vetorização: ' + error.message);
    } finally {
        workspace.isVectorizing = false;
    }
}



  return {
    layers, folders, selectedLayerId, selectedLayer, activeTool, workspace, mockupLayer, rulerSource, isSelectionActive, copiedSelection, primaryColor, brush, eraser,
    editingVector,
    setRulerUnit, togglePreviewInteractivity, setPreviewZoom, startLasso, updateLasso, endLasso, addLayer, addLocalLayer, selectLayer, updateLayerProperties,
    setActiveTool, setActiveShapeTool, drawShapeOnCanvas,
    updateWorkspace, toggleViewMode, deleteLayer, bringForward, sendBackward, moveLayer, frameLayer, startSelection, updateSelection, endSelection,
    clearSelection, startLayerResize, updateLayerResize, startLayerRotation, updateLayerRotation, showContextMenu, showSelectionContextMenu, showResizeModal,
    resizeMockup, showPreviewSidebar, showSignatureModal, getLayerBlob, updateLayerAdjustments, flipLayer, rotateLayer, duplicateLayer, copySelectionToClipboard,
    pasteSelection, duplicateSelection, cutoutSelection, applyPaintToLayer, floodFillLayer, setBrushOption, setEraserOption, setPrimaryColor,
    eraseFromLayer, mergeDown, selectWithMagicWand,
    undoLastAction, updateLayerFromHistory, setGlobalState,
    getClonedLayerState, commitLayerStateToHistory,
    setTransformingState,
    togglePanel, updatePanelState, getPanelState,
    zoomIn, zoomOut, zoomToFit, zoomAtPoint,
    createBlankCanvas,
    rasterizeVectorLayer, exportLayer,
    exportDrawnArea,
    initializeEmptyWorkspace,
    createDrawingLayer,
    trimLayerToObjectBounds,
    vectorizeLayer,
    createFolder, renameFolder, deleteFolder, toggleFolderLock, moveLayerToFolder, toggleFolderVisibility, duplicateFolder,
    enterVectorEditMode, exitVectorEditMode, moveVectorPoint,
    addCurvePoint, moveVectorControlPoint
  }
})
