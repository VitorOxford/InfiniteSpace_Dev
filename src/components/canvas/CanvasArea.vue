<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'
import SelectionOverlay from './SelectionOverlay.vue'
import BoundingBox from './BoundingBox.vue'

const props = defineProps({
  isMobile: Boolean,
})

const store = useCanvasStore()
const canvasRef = ref(null)
let ctx = null

const offscreenCanvas = document.createElement('canvas')
const offscreenCtx = offscreenCanvas.getContext('2d')

let actionStartState = null;
let currentActionName = null;

let isPanning = false
let isDraggingLayer = false
let isTransformingLayer = false
let isDrawingSelection = false
let isPainting = false
let isErasing = false
let isWandSelecting = false;
let isPinching = false; // Flag para controlar o estado de pinça
let currentStroke = []
let transformType = null
let dragStartOffset = { x: 0, y: 0 }
let lastPanPosition = { x: 0, y: 0 }
let lastTouchDistance = null;

const gridStyle = computed(() => ({
  '--grid-position-x': `${store.workspace.pan.x}px`,
  '--grid-position-y': `${store.workspace.pan.y}px`,
  '--grid-size': `${50 * store.workspace.zoom}px`,
}))

function renderCanvas() {
  if (!ctx) return
  const canvas = canvasRef.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (store.workspace.viewMode === 'preview') {
    renderPreviewMode(canvas)
  } else {
    renderEditMode(canvas)
  }
}

function renderEditMode(canvas) {
  ctx.save()
  ctx.translate(store.workspace.pan.x, store.workspace.pan.y)
  ctx.scale(store.workspace.zoom, store.workspace.zoom)

  for (const layer of store.layers) {
    if (!layer.visible || !layer.image) continue
    ctx.save()

    const adj = layer.adjustments
    const tempAdjStore = useImageAdjustmentsStore()
    const finalAdj =
      layer.id === tempAdjStore.targetLayerId && tempAdjStore.isModalVisible
        ? tempAdjStore.tempAdjustments
        : adj

    ctx.filter = [
      `grayscale(${finalAdj.grayscale || 0}%)`,
      `sepia(${finalAdj.sepia || 0}%)`,
      `saturate(${finalAdj.saturate || 100}%)`,
      `contrast(${finalAdj.contrast || 100}%)`,
      `brightness(${finalAdj.brightness || 100}%)`,
      `invert(${finalAdj.invert || 0}%)`,
    ].join(' ')

    ctx.translate(layer.x, layer.y)

    const scaleX = finalAdj.flipH ? -1 : 1
    const scaleY = finalAdj.flipV ? -1 : 1
    ctx.scale(scaleX, scaleY)

    ctx.rotate(layer.rotation)
    ctx.scale(layer.scale, layer.scale)
    ctx.globalAlpha = layer.opacity

    const imageToRender = (store.workspace.isTransforming && layer.lowResProxy) ? layer.lowResProxy : layer.image;

    ctx.imageSmoothingEnabled = !(store.workspace.isTransforming && layer.lowResProxy);

    ctx.drawImage(
      imageToRender,
      -layer.metadata.originalWidth / 2,
      -layer.metadata.originalHeight / 2,
      layer.metadata.originalWidth,
      layer.metadata.originalHeight,
    )
    ctx.restore()
  }
  ctx.restore()
}

function renderPreviewMode(canvas) {
  const mainMockup = store.mockupLayer
  if (!mainMockup || !mainMockup.image) return

  const finalMockupWidth = mainMockup.metadata.originalWidth * mainMockup.scale
  const finalMockupHeight = mainMockup.metadata.originalHeight * mainMockup.scale

  offscreenCanvas.width = finalMockupWidth
  offscreenCanvas.height = finalMockupHeight

  offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

  const patterns = store.layers.filter((l) => l.type === 'pattern' && l.visible && l.image)
  const mockups = store.layers.filter((l) => l.type === 'mockup' && l.visible && l.image)

  for (const layer of patterns) {
    offscreenCtx.save()
    const pattern = offscreenCtx.createPattern(layer.image, 'repeat')
    const matrix = new DOMMatrix()
      .translate(layer.x, layer.y)
      .rotate(layer.rotation * (180 / Math.PI))
      .scale(layer.scale)
      .translate(-layer.x, -layer.y)
      .translate(
        layer.x - (layer.metadata.originalWidth / 2) * layer.scale,
        layer.y - (layer.metadata.originalHeight / 2) * layer.scale,
      )

    pattern.setTransform(matrix)
    offscreenCtx.fillStyle = pattern
    offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
    offscreenCtx.restore()
  }

  for (const layer of mockups) {
    offscreenCtx.save()
    offscreenCtx.globalAlpha = layer.opacity
    offscreenCtx.drawImage(layer.image, 0, 0, finalMockupWidth, finalMockupHeight)
    offscreenCtx.restore()
  }

  ctx.save()
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-surface-dark')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const padding = 0.9
  const finalScale = Math.min(
    (canvas.width * padding) / offscreenCanvas.width,
    (canvas.height * padding) / offscreenCanvas.height,
  )

  const finalWidth = offscreenCanvas.width * finalScale
  const finalHeight = offscreenCanvas.height * finalScale
  const dx = (canvas.width - finalWidth) / 2
  const dy = (canvas.height - finalHeight) / 2

  ctx.drawImage(offscreenCanvas, dx, dy, finalWidth, finalHeight)
  ctx.restore()
}

function initCanvas() {
  ctx = canvasRef.value.getContext('2d')
  setupEventListeners()
  resizeCanvas()
}

function resizeCanvas() {
  const wrapper = canvasRef.value.parentElement;
  if (!wrapper) return
  const { width, height } = wrapper.getBoundingClientRect()
  canvasRef.value.width = width
  canvasRef.value.height = height
  renderCanvas()
}

function setupEventListeners() {
  const canvas = canvasRef.value
  canvas.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mouseleave', handleMouseUp)

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
  canvas.addEventListener('touchend', handleTouchEnd)
  canvas.addEventListener('touchcancel', handleTouchEnd)

  canvas.addEventListener('wheel', handleWheel, { passive: false })
  canvas.addEventListener('contextmenu', handleContextMenu)
}

function cleanupEventListeners() {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mouseleave', handleMouseUp)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('mousedown', handleMouseDown)
    canvas.removeEventListener('touchstart', handleTouchStart)
    canvas.removeEventListener('touchmove', handleTouchMove)
    canvas.removeEventListener('touchend', handleTouchEnd)
    canvas.removeEventListener('touchcancel', handleTouchEnd)
    canvas.removeEventListener('wheel', handleWheel)
    canvas.removeEventListener('contextmenu', handleContextMenu)
  }
}

function getEventCoordinates(e) {
    const rect = canvasRef.value.getBoundingClientRect();
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null);

    if (touch) {
        return {
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
            clientX: touch.clientX,
            clientY: touch.clientY
        };
    }
    return {
        offsetX: e.offsetX,
        offsetY: e.offsetY,
        clientX: e.clientX,
        clientY: e.clientY
    };
}


function onHandleMouseDown({ event, type, cursor }) {
  event.preventDefault()
  event.stopPropagation();
  if (!store.selectedLayer) return
  isTransformingLayer = true
  transformType = type
  document.body.style.cursor = cursor
  store.setTransformingState(true);
  actionStartState = store.getClonedLayerState(store.selectedLayer);
  currentActionName = type === 'rotate' ? 'Rodar' : 'Redimensionar';
  const coords = getEventCoordinates(event);
  const mouse = { x: coords.clientX, y: coords.clientY }
  const layer = store.selectedLayer
  if (type === 'rotate') {
    const layerScreenPos = getLayerScreenCenter(layer)
    const startAngle = Math.atan2(mouse.y - layerScreenPos.y, mouse.x - layerScreenPos.x)
    store.startLayerRotation(startAngle)
  } else {
    store.startLayerResize(mouse, layer.scale)
  }
}

function handleContextMenu(e) {
  e.preventDefault()
  const mouse = { x: e.offsetX, y: e.offsetY }
  const clickedLayer = getLayerAtPosition(mouse)
  if (clickedLayer) {
    store.showContextMenu(true, { x: e.clientX, y: e.clientY }, clickedLayer.id, false)
  }
}

function handleInteractionStart(e) {
    if (isPinching) return; // Adicionado para segurança
    if (store.workspace.isContextMenuVisible) store.showContextMenu(false);
    if (store.workspace.isSelectionContextMenuVisible) store.showSelectionContextMenu(false);

    const coords = getEventCoordinates(e);
    const mouse = { x: coords.offsetX, y: coords.offsetY };
    const worldMouse = screenToWorkspaceCoords(mouse);
    const clickedLayer = getLayerAtPosition(mouse);

    if (clickedLayer && store.selectedLayerId !== clickedLayer.id) {
        store.selectLayer(clickedLayer.id);
    }

    const layerCoords = store.selectedLayer ? screenToLayerCoords(mouse, store.selectedLayer) : null;

    switch (store.activeTool) {
        case 'magic-wand':
            if (!layerCoords) return;
            isWandSelecting = true;
            store.selectWithMagicWand(layerCoords, e.shiftKey);
            break;
        case 'brush':
            if (!layerCoords && !store.selectedLayer) store.createDrawingLayer();
            isPainting = true;
            actionStartState = store.getClonedLayerState(store.selectedLayer);
            currentActionName = 'Pintura';
            currentStroke = [layerCoords || worldMouse];
            store.applyPaintToLayer(currentStroke);
            break;
        case 'bucket':
            if (!layerCoords) return;
            store.floodFillLayer(layerCoords.x, layerCoords.y);
            break;
        case 'eyedropper':
            const pixel = ctx.getImageData(mouse.x, mouse.y, 1, 1).data;
            const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
            store.setPrimaryColor(hex);
            store.setActiveTool('brush');
            break;
        case 'eraser':
             if (!layerCoords) return;
            isErasing = true;
            actionStartState = store.getClonedLayerState(store.selectedLayer);
            currentActionName = 'Apagar';
            currentStroke = [layerCoords];
            store.eraseFromLayer(currentStroke);
            break;
        case 'rect-select':
            isDrawingSelection = true;
            store.startSelection(worldMouse);
            break;
        case 'lasso-select':
            isDrawingSelection = true;
            store.startLasso(worldMouse);
            break;
        case 'move':
            if (clickedLayer) {
                isDraggingLayer = true;
                store.setTransformingState(true);
                actionStartState = store.getClonedLayerState(clickedLayer);
                currentActionName = 'Mover';
                const worldMouseCoords = screenToWorkspaceCoords(mouse);
                dragStartOffset = { x: worldMouseCoords.x - clickedLayer.x, y: worldMouseCoords.y - clickedLayer.y };
            } else {
                isPanning = true;
                lastPanPosition = { x: coords.clientX, y: coords.clientY };
                canvasRef.value.style.cursor = 'grabbing';
            }
            break;
        default:
            isPanning = true;
            lastPanPosition = { x: coords.clientX, y: coords.clientY };
            canvasRef.value.style.cursor = 'grabbing';
            break;
    }
}


function handleInteractionMove(e) {
    const coords = getEventCoordinates(e);
    const mouse = { x: coords.clientX, y: coords.clientY };
    const canvasMouse = { x: coords.offsetX, y: coords.offsetY };
    const worldMouse = screenToWorkspaceCoords(canvasMouse);

    if (isWandSelecting && store.selectedLayer) {
        const layerCoords = screenToLayerCoords(canvasMouse, store.selectedLayer);
        store.selectWithMagicWand(layerCoords, true);
        return;
    }

    if (isPainting && store.selectedLayer) {
        const layerCoords = screenToLayerCoords(canvasMouse, store.selectedLayer);
        currentStroke.push(layerCoords);
        store.applyPaintToLayer(currentStroke.slice(-2));
        return;
    }

    if (isErasing && store.selectedLayer) {
        const layerCoords = screenToLayerCoords(canvasMouse, store.selectedLayer);
        currentStroke.push(layerCoords);
        store.eraseFromLayer(currentStroke.slice(-2));
        return;
    }

    if (isTransformingLayer) {
        if (transformType === 'rotate') {
            const layer = store.selectedLayer
            if (!layer) return
            const layerScreenPos = getLayerScreenCenter(layer)
            const currentAngle = Math.atan2(mouse.y - layerScreenPos.y, mouse.x - layerScreenPos.x)
            store.updateLayerRotation(currentAngle)
        } else if (transformType && transformType.startsWith('resize')) {
            store.updateLayerResize(mouse)
        }
        return
    }

    if (isDrawingSelection) {
        if (store.activeTool === 'rect-select') store.updateSelection(worldMouse)
        if (store.activeTool === 'lasso-select') store.updateLasso(worldMouse)
        return
    }

    if (isDraggingLayer && store.selectedLayer) {
        const newX = worldMouse.x - dragStartOffset.x
        const newY = worldMouse.y - dragStartOffset.y
        store.updateLayerProperties(store.selectedLayer.id, { x: newX, y: newY })
        return
    }
    if (isPanning) {
        const dx = coords.clientX - lastPanPosition.x
        const dy = coords.clientY - lastPanPosition.y
        store.updateWorkspace({ pan: { x: store.workspace.pan.x + dx, y: store.workspace.pan.y + dy } })
        lastPanPosition = { x: coords.clientX, y: coords.clientY }
    }
}

function handleInteractionEnd(e) {
    if (store.workspace.isTransforming) {
        store.setTransformingState(false);
        requestAnimationFrame(renderCanvas);
    }

    const coords = getEventCoordinates(e);
    const mousePosition = { x: coords.clientX, y: coords.clientY };

    if (actionStartState && currentActionName) {
        if(store.selectedLayer) {
            store.commitLayerStateToHistory(store.selectedLayer.id, actionStartState, currentActionName);
        }
        actionStartState = null;
        currentActionName = null;
    }

    if (isWandSelecting) {
        isWandSelecting = false;
        if (store.isSelectionActive) {
            store.showSelectionContextMenu(true, mousePosition);
        }
    }

    if (isDrawingSelection) {
        if (store.activeTool === 'rect-select') store.endSelection(mousePosition)
        if (store.activeTool === 'lasso-select') store.endLasso(mousePosition)
    }
    if (isPainting || isErasing) {
        isPainting = false;
        isErasing = false;
        currentStroke = [];
    }

    isPanning = false
    isDraggingLayer = false
    isTransformingLayer = false
    isDrawingSelection = false
    isWandSelecting = false;
    isPinching = false;
    lastTouchDistance = null;
    document.body.style.cursor = 'default'

    const cursorMap = {
        'rect-select': 'crosshair', 'lasso-select': 'crosshair', 'magic-wand': 'crosshair',
        brush: 'crosshair', eraser: 'crosshair', move: 'grab',
    }
    if (canvasRef.value) {
        canvasRef.value.style.cursor = cursorMap[store.activeTool] || 'default'
    }
}


function handlePinchMove(e) {
    if (!isPinching || e.touches.length < 2 || lastTouchDistance === null) return;
    e.preventDefault();

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const zoomFactor = dist / lastTouchDistance;

    const rect = canvasRef.value.getBoundingClientRect();
    const midPoint = {
        x: ((t1.clientX + t2.clientX) / 2) - rect.left,
        y: ((t1.clientY + t2.clientY) / 2) - rect.top
    };

    store.zoomAtPoint(zoomFactor, midPoint);
    lastTouchDistance = dist;
}

function handleMouseDown(e) {
    if (e.button !== 0) return;
    handleInteractionStart(e);
}
function handleMouseMove(e) {
    handleInteractionMove(e);
}
function handleMouseUp(e) {
    handleInteractionEnd(e);
}

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
        isPinching = true;
        isPanning = false;
        isDraggingLayer = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        return;
    }
    if (e.touches.length === 1 && !isPinching) {
        handleInteractionStart(e);
    }
}


function handleTouchMove(e) {
    e.preventDefault();
    if (isPinching) {
        handlePinchMove(e);
    } else if (e.touches.length === 1) {
        handleInteractionMove(e);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length < 2) {
        isPinching = false;
        lastTouchDistance = null;
    }
    handleInteractionEnd(e);
}

function handleWheel(e) { e.preventDefault(); if (store.workspace.viewMode === 'preview') return; const zoomIntensity = 0.1; const direction = e.deltaY < 0 ? 1 : -1; const mouse = { x: e.offsetX, y: e.offsetY }; const { pan, zoom } = store.workspace; const worldX = (mouse.x - pan.x) / zoom; const worldY = (mouse.y - pan.y) / zoom; const newZoom = zoom * (1 + direction * zoomIntensity); const saneZoom = Math.max(0.02, Math.min(newZoom, 10)); const newPanX = mouse.x - worldX * saneZoom; const newPanY = mouse.y - worldY * saneZoom; store.updateWorkspace({ zoom: saneZoom, pan: { x: newPanX, y: newPanY } }); }
function screenToWorkspaceCoords(screenCoords) { const { pan, zoom } = store.workspace; return { x: (screenCoords.x - pan.x) / zoom, y: (screenCoords.y - pan.y) / zoom }; }
function screenToLayerCoords(screenCoords, layer) { const { pan, zoom } = store.workspace; const { x: layerX, y: layerY, scale, rotation, metadata, adjustments } = layer; const { originalWidth, originalHeight } = metadata; const worldX = (screenCoords.x - pan.x) / zoom; const worldY = (screenCoords.y - pan.y) / zoom; const dx = worldX - layerX; const dy = worldY - layerY; const cos = Math.cos(-rotation); const sin = Math.sin(-rotation); const rotatedX = dx * cos - dy * sin; const rotatedY = dx * sin + dy * cos; const unscaledX = rotatedX / scale; const unscaledY = rotatedY / scale; const scaleFlipX = adjustments.flipH ? -1 : 1; const scaleFlipY = adjustments.flipV ? -1 : 1; const unscaledFlippedX = unscaledX / scaleFlipX; const unscaledFlippedY = unscaledY / scaleFlipY; return { x: unscaledFlippedX + originalWidth / 2, y: unscaledFlippedY + originalHeight / 2, }; }
function getLayerScreenCenter(layer) { const { pan, zoom } = store.workspace; return { x: layer.x * zoom + pan.x, y: layer.y * zoom + pan.y }; }
function getLayerAtPosition(screenCoords) { for (let i = store.layers.length - 1; i >= 0; i--) { const layer = store.layers[i]; if (!layer.image || !layer.visible) continue; const { x, y } = screenToLayerCoords(screenCoords, layer); if (x >= 0 && x <= layer.metadata.originalWidth && y >= 0 && y <= layer.metadata.originalHeight) { return layer; } } return null; }

watch( () => store.activeTool, (newTool) => { if (canvasRef.value) { const cursorMap = { 'rect-select': 'crosshair', 'lasso-select': 'crosshair', 'magic-wand': 'crosshair', brush: 'crosshair', eraser: 'crosshair', move: 'grab', }; canvasRef.value.style.cursor = cursorMap[newTool] || 'default'; } }, )
watch( () => [ store.layers.map(l => l.version), store.workspace.zoom, store.workspace.pan, store.layers, store.workspace.isTransforming ], () => { requestAnimationFrame(renderCanvas); }, { deep: true }, )
const adjustmentsStore = useImageAdjustmentsStore(); watch( () => [adjustmentsStore.tempAdjustments, adjustmentsStore.isModalVisible], () => { requestAnimationFrame(renderCanvas); }, { deep: true }, )
onMounted(initCanvas);
onUnmounted(cleanupEventListeners);

watch(() => [canvasRef.value?.parentElement?.clientWidth, canvasRef.value?.parentElement?.clientHeight], () => {
    resizeCanvas();
});
</script>

<template>
    <div class="canvas-content" :style="gridStyle">
        <div
            v-if="store.workspace.grid.visible && store.workspace.viewMode === 'edit'"
            class="grid-overlay"
        ></div>
        <canvas ref="canvasRef" id="mainCanvas"></canvas>
        <slot></slot>
        <BoundingBox v-if="store.selectedLayer" @handle-mouse-down="onHandleMouseDown" />
        <SelectionOverlay />
    </div>
</template>

<style scoped>
.canvas-content {
  width: 100%;
  height: 100%;
  position: relative;
  touch-action: none;
}

#mainCanvas {
  position: absolute;
  top: 0;
  left: 0;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    repeating-linear-gradient(var(--c-border) 0 1px, transparent 1px 100%),
    repeating-linear-gradient(90deg, var(--c-border) 0 1px, transparent 1px 100%);
  background-size: var(--grid-size, 50px) var(--grid-size, 50px);
  background-position: var(--grid-position-x) var(--grid-position-y);
  pointer-events: none;
  opacity: 0.5;
}
</style>
