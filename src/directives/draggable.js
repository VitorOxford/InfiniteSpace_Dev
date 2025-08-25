// src/directives/draggable.js
import { useCanvasStore } from '@/stores/canvasStore';

export const draggable = {
  mounted(el, binding) {
    const store = useCanvasStore();
    const panelId = binding.value?.panelId;
    if (!store || !panelId) {
      console.error('Draggable directive requires a panelId.');
      return;
    }

    const handle = el.querySelector('.draggable-handle') || el;
    handle.style.cursor = 'move';

    let initialTop, initialLeft;
    let initialMouseX, initialMouseY;
    let isDragging = false;

    const onMouseDown = (e) => {
      if (e.target.closest('button, input, .resize-handle')) return;
      if (e.type === 'mousedown' && e.button !== 0) return;

      isDragging = true;
      const event = e.touches ? e.touches[0] : e;


      initialTop = el.offsetTop;
      initialLeft = el.offsetLeft;
      initialMouseX = event.clientX;
      initialMouseY = event.clientY;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('touchmove', onMouseMove, { passive: false });

      document.addEventListener('mouseup', onMouseUp, { once: true });
      document.addEventListener('touchend', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const event = e.touches ? e.touches[0] : e;

      const dx = event.clientX - initialMouseX;
      const dy = event.clientY - initialMouseY;

      el.style.top = `${initialTop + dy}px`;
      el.style.left = `${initialLeft + dx}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onMouseMove);

      store.updatePanelState(panelId, {
        position: {
          top: el.offsetTop,
          left: el.offsetLeft
        }
      });
    };

    handle.addEventListener('mousedown', onMouseDown);
    handle.addEventListener('touchstart', onMouseDown, { passive: false });


    el.__vDraggableCleanup = () => {
      handle.removeEventListener('mousedown', onMouseDown);
      handle.removeEventListener('touchstart', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);
    };
  },
  unmounted(el) {
    if (el.__vDraggableCleanup) {
      el.__vDraggableCleanup();
    }
  },
};
