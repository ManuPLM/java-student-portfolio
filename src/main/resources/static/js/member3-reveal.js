(() => {
  const initialize = async () => {
    const reveal = document.querySelector('.portrait-reveal');
    if (!reveal) return;

    const stage = reveal.querySelector('.portrait-stage');
    const face = reveal.querySelector('.portrait-face');
    const canvas = reveal.querySelector('.portrait-cartoon');
    const crayon = document.querySelector('.portrait-crayon');
    const fallback = reveal.querySelector('.portrait-fallback');
    const context = canvas.getContext('2d');
    let cssWidth = 0;
    let cssHeight = 0;
    let canvasPainted = false;
    let pointerDown = false;
    let lastPointerPoint = null;
    let keyboardPoint = null;

    const loadImage = (image) => {
      if (image.complete) {
        return image.naturalWidth > 0
          ? Promise.resolve()
          : Promise.reject(new Error(`Unable to load ${image.src}`));
      }

      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error(`Unable to load ${image.src}`)), { once: true });
      });
    };

    const cartoon = new Image();
    cartoon.src = reveal.dataset.cartoonSrc;

    try {
      await Promise.all([loadImage(face), loadImage(cartoon)]);
    } catch (error) {
      reveal.classList.add('is-unavailable');
      crayon.hidden = true;
      fallback.hidden = false;
      return;
    }

    const paintCartoon = () => {
      const scale = Math.max(cssWidth / cartoon.naturalWidth, cssHeight / cartoon.naturalHeight);
      const width = cartoon.naturalWidth * scale;
      const height = cartoon.naturalHeight * scale;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(cartoon, (cssWidth - width) / 2, (cssHeight - height) / 2, width, height);
    };

    const resize = () => {
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      cssWidth = bounds.width;
      cssHeight = bounds.height;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      paintCartoon();
      canvasPainted = true;
    };

    const paintSmear = (from, to) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const normalX = distance ? -dy / distance : 0;
      const normalY = distance ? dx / distance : 0;

      context.save();
      context.globalCompositeOperation = 'destination-out';
      context.lineCap = 'round';
      context.lineJoin = 'round';

      [
        { offset: 0, width: 22, opacity: 0.48 },
        { offset: -6, width: 4, opacity: 0.28 },
        { offset: 6, width: 5, opacity: 0.24 }
      ].forEach((stroke) => {
        context.globalAlpha = stroke.opacity;
        context.lineWidth = stroke.width;
        context.beginPath();
        if (distance < 1) {
          context.arc(to.x, to.y, stroke.width / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.moveTo(from.x + normalX * stroke.offset, from.y + normalY * stroke.offset);
          context.lineTo(to.x + normalX * stroke.offset, to.y + normalY * stroke.offset);
          context.stroke();
        }
      });

      context.restore();
    };

    const pointInStage = (clientX, clientY) => {
      const bounds = stage.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
        return null;
      }
      return { x: clientX - bounds.left, y: clientY - bounds.top };
    };

    const positionCrayon = (clientX, clientY) => {
      crayon.style.left = `${clientX - crayon.offsetWidth / 2}px`;
      crayon.style.top = `${clientY - crayon.offsetHeight / 2}px`;
    };

    const moveCrayon = (clientX, clientY) => {
      positionCrayon(clientX, clientY);
      const point = pointInStage(clientX, clientY);
      if (!point) {
        lastPointerPoint = null;
        return;
      }
      paintSmear(lastPointerPoint || point, point);
      lastPointerPoint = point;
    };

    crayon.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pointerDown = true;
      crayon.classList.add('is-dragging');
      crayon.setPointerCapture(event.pointerId);
      moveCrayon(event.clientX, event.clientY);
    });

    crayon.addEventListener('pointermove', (event) => {
      if (pointerDown) moveCrayon(event.clientX, event.clientY);
    });

    const stopDragging = () => {
      pointerDown = false;
      lastPointerPoint = null;
      crayon.classList.remove('is-dragging');
      crayon.style.left = '';
      crayon.style.top = '';
    };
    crayon.addEventListener('pointerup', stopDragging);
    crayon.addEventListener('pointercancel', stopDragging);
    crayon.addEventListener('lostpointercapture', stopDragging);

    crayon.addEventListener('keydown', (event) => {
      const directions = {
        ArrowUp: [0, -6],
        ArrowDown: [0, 6],
        ArrowLeft: [-6, 0],
        ArrowRight: [6, 0]
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        event.stopPropagation();
        const bounds = stage.getBoundingClientRect();
        const point = keyboardPoint || { x: bounds.width / 2, y: bounds.height / 2 };
        const nextPoint = {
          x: Math.max(0, Math.min(cssWidth, point.x + direction[0])),
          y: Math.max(0, Math.min(cssHeight, point.y + direction[1]))
        };
        paintSmear(point, nextPoint);
        keyboardPoint = nextPoint;
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        keyboardPoint ||= { x: cssWidth / 2, y: cssHeight / 2 };
        paintSmear(keyboardPoint, keyboardPoint);
      }
    });

    new ResizeObserver(resize).observe(stage);
    resize();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
