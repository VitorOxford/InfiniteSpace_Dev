// src/directives/resizable.js
import { useCanvasStore } from '@/stores/canvasStore';

export const resizable = {
  mounted(el, binding) {
    const store = useCanvasStore();
    const panelId = binding.value?.panelId;
    if (!store || !panelId) return;

    const handles = el.querySelectorAll('.resize-handle');
    let originalWidth, originalHeight, originalX, originalY, originalMouseX, originalMouseY;
    let currentHandleType;

    const onMouseMove = (e) => {
      e.preventDefault();
      const event = e.touches ? e.touches[0] : e;

      window.requestAnimationFrame(() => {
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        let newLeft = el.offsetLeft;
        let newTop = el.offsetTop;

        const dx = event.clientX - originalMouseX;
        const dy = event.clientY - originalMouseY;

        if (currentHandleType.includes('right')) newWidth = originalWidth + dx;
        if (currentHandleType.includes('bottom')) newHeight = originalHeight + dy;
        if (currentHandleType.includes('left')) {
          newWidth = originalWidth - dx;
          newLeft = originalX + dx;
        }
        if (currentHandleType.includes('top')) {
          newHeight = originalHeight - dy;
          newTop = originalY + dy;
        }

        if (newWidth > 250) {
          el.style.width = `${newWidth}px`;
          el.style.left = `${newLeft}px`;
        }
        if (newHeight > 150) {
          el.style.height = `${newHeight}px`;
          el.style.top = `${newTop}px`;
        }
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);


      const rect = el.getBoundingClientRect();
      store.updatePanelState(panelId, {
        size: { width: rect.width, height: rect.height }
      });
    };

    const onMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const event = e.touches ? e.touches[0] : e;

        currentHandleType = e.target.dataset.handle;
        originalWidth = el.offsetWidth;
        originalHeight = el.offsetHeight;
        originalX = el.offsetLeft;
        originalY = el.offsetTop;
        originalMouseX = event.clientX;
        originalMouseY = event.clientY;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp, { once: true });
        document.addEventListener('touchend', onMouseUp, { once: true });
    };

    handles.forEach(handle => {
      handle.addEventListener('mousedown', onMouseDown);
      handle.addEventListener('touchstart', onMouseDown, { passive: false });
    });

    el.__vResizableCleanup = () => {
       handles.forEach(handle => {
          handle.removeEventListener('mousedown', onMouseDown);
          handle.removeEventListener('touchstart', onMouseDown);
       });
    };
  },
  unmounted(el) {
    if (el.__vResizableCleanup) {
      el.__vResizableCleanup();
    }
  },
};
