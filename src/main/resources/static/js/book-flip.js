(() => {
  const book = document.getElementById('portfolioBook');
  const cover = document.getElementById('bookCover');
  const previewDialog = document.createElement('dialog');
  previewDialog.className = 'page-preview-dialog';
  previewDialog.setAttribute('aria-label', 'Enlarged portfolio page preview');
  previewDialog.innerHTML = `
    <div class="page-preview-layout">
      <header class="page-preview-toolbar">
        <div class="page-preview-actions">
          <button type="button" data-zoom-action="out" aria-label="Zoom out">−</button>
          <button type="button" data-zoom-action="reset" aria-label="Reset zoom">100%</button>
          <button type="button" data-zoom-action="in" aria-label="Zoom in">+</button>
          <button type="button" data-zoom-action="close" aria-label="Close page preview">Close</button>
        </div>
      </header>
      <div class="page-preview-viewport" tabindex="0" aria-label="Scrollable enlarged page">
        <div class="page-preview-canvas"></div>
      </div>
    </div>`;
  document.body.append(previewDialog);

  const previewCanvas = previewDialog.querySelector('.page-preview-canvas');
  const previewResetButton = previewDialog.querySelector('[data-zoom-action="reset"]');
  const previewViewport = previewDialog.querySelector('.page-preview-viewport');
  let previewZoom = 1;
  let previewTrigger = null;
  let selectBookPage = null;

  const updatePreviewZoom = () => {
    const sheet = previewCanvas.firstElementChild;
    if (!sheet) return;
    previewCanvas.style.width = `${sheet.offsetWidth * previewZoom}px`;
    previewCanvas.style.height = `${sheet.offsetHeight * previewZoom}px`;
    sheet.style.transform = `scale(${previewZoom})`;
    previewResetButton.textContent = `${Math.round(previewZoom * 100)}%`;
  };

  const openPreview = (page, trigger) => {
    const copy = page.cloneNode(true);
    copy.querySelectorAll('.page-zoom-trigger').forEach((button) => button.remove());
    copy.classList.add('page-preview-sheet');
    copy.__previewSourcePage = page;
    previewCanvas.replaceChildren(copy);
    previewZoom = 1;
    previewTrigger = trigger;
    previewDialog.showModal();
    window.initializeM4MusicPlayers?.(copy);
    window.requestAnimationFrame(updatePreviewZoom);
    previewViewport.scrollTop = 0;
    previewViewport.scrollLeft = 0;
  };

  const makeZoomIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const lens = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    lens.setAttribute('cx', '10.5');
    lens.setAttribute('cy', '10.5');
    lens.setAttribute('r', '6.5');
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    handle.setAttribute('d', 'm15.5 15.5 5 5');
    svg.append(lens, handle);
    return svg;
  };

  const addNotebookRulings = () => {
    document.querySelectorAll('.paper-page, body.member-page .member-paper, .page-leaf > .leaf-back').forEach((page) => {
      if (page.matches('.member-paper') && page.closest('.paper-page')) return;
      page.classList.add('page-line-surface');
      if (page.querySelector(':scope > .page-ruling')) return;
      const ruling = document.createElement('div');
      ruling.className = 'page-ruling';
      ruling.setAttribute('aria-hidden', 'true');
      page.prepend(ruling);
    });
  };

  const addPreviewButtons = () => {
    const pages = document.querySelectorAll('.paper-page, body.member-page .member-paper');
    pages.forEach((page) => {
      if (page.matches('.member-paper') && page.closest('.paper-page')) return;
      if (page.querySelector(':scope > .page-zoom-trigger')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'page-zoom-trigger';
      button.setAttribute('aria-label', 'Open enlarged page preview');
      button.title = 'Open enlarged page preview';
      button.append(makeZoomIcon());
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPreview(page, button);
      });
      page.append(button);
    });
  };

  addNotebookRulings();
  addPreviewButtons();

  previewDialog.querySelectorAll('[data-zoom-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.zoomAction;
      if (action === 'close') {
        previewDialog.close();
        return;
      }
      if (action === 'reset') {
        previewZoom = 1;
      } else {
        previewZoom = Math.min(2.5, Math.max(0.75, previewZoom + (action === 'in' ? 0.25 : -0.25)));
      }
      updatePreviewZoom();
    });
  });

  previewDialog.addEventListener('click', (event) => {
    if (event.target === previewDialog) {
      previewDialog.close();
      return;
    }
    const pageLink = event.target.closest('[data-page-target]');
    if (pageLink && selectBookPage) {
      event.preventDefault();
      const page = Number(pageLink.dataset.pageTarget);
      previewDialog.close();
      selectBookPage(page);
    }
  });
  previewDialog.addEventListener('close', () => {
    const originalPage = previewTrigger?.closest('.paper-page') ||
      previewTrigger?.closest('.member-paper');
    const previewPage = previewCanvas.firstElementChild;
    if (originalPage && previewPage) {
      window.syncM4MusicPreview?.(previewPage, originalPage);
    }
    previewCanvas.replaceChildren();
    previewCanvas.style.width = '';
    previewCanvas.style.height = '';
    if (previewTrigger?.isConnected) previewTrigger.focus();
    previewTrigger = null;
  });
  window.addEventListener('resize', () => {
    if (previewDialog.open) updatePreviewZoom();
  });

  if (!book || !cover) return;

  const leaves = [...book.querySelectorAll('.page-leaf')];
  const pageStack = book.querySelector('.page-stack');
  const scene = book.closest('.book-scene');
  let currentPage = 0;
  let isAnimating = false;
  const flipDuration = 1150;
  const pageStagger = 80;

  const fitBookPages = () => {
    book.querySelectorAll('.page-leaf .member-paper').forEach((page) => {
      const paper = page.closest('.paper-page');
      if (!paper) return;
      page.style.setProperty('--page-fit-scale', '1');
      page.style.width = '100%';
      page.style.height = '100%';
      const contentHeight = page.scrollHeight;
      const availableHeight = paper.clientHeight;
      if (contentHeight > availableHeight && availableHeight > 0) {
        const scale = Math.max(0.85, availableHeight / contentHeight);
        page.style.setProperty('--page-fit-scale', scale.toFixed(3));
        page.style.width = `${100 / scale}%`;
        page.style.height = `${100 / scale}%`;
      }
    });
  };
  window.addEventListener('resize', fitBookPages);
  if (document.fonts?.ready) document.fonts.ready.then(fitBookPages);
  window.requestAnimationFrame(fitBookPages);

  if (pageStack) {
    pageStack.appendChild(cover);
  }

  const updateStack = () => {
    if (scene) {
      scene.classList.toggle('is-book-open', book.classList.contains('is-open'));
    }
    cover.style.setProperty(
      'z-index',
      book.classList.contains('is-open') ? '1' : '100',
      'important'
    );
    leaves.forEach((leaf) => {
      const page = Number(leaf.dataset.page);
      const zIndex = page < currentPage
        ? page + 2
        : page === currentPage
          ? leaves.length + 20
          : leaves.length + 10 - page;
      leaf.style.setProperty('z-index', String(zIndex), 'important');
    });
  };

  const closeBook = () => {
    book.classList.remove('is-open');
    cover.setAttribute('aria-expanded', 'false');
    cover.setAttribute('aria-label', 'Open the diary');
    currentPage = 0;
    leaves.forEach((leaf) => leaf.classList.remove('is-turned'));
    updateStack();
  };

  const flipTo = (page) => {
    const next = Math.max(0, Math.min(page, leaves.length - 1));
    if (next === currentPage || isAnimating) return;
    const direction = next > currentPage ? 1 : -1;
    const changing = direction > 0
      ? leaves.slice(currentPage, next)
      : leaves.slice(next, currentPage).reverse();
    isAnimating = true;
    changing.forEach((leaf, index) => {
      window.setTimeout(() => {
        leaf.style.setProperty('z-index', String(leaves.length + 30), 'important');
        void leaf.offsetWidth;
        requestAnimationFrame(() => {
          leaf.classList.toggle('is-turned', direction > 0);
        });
      }, index * pageStagger);
    });
    window.setTimeout(() => {
      currentPage = next;
      updateStack();
      isAnimating = false;
    }, (changing.length - 1) * pageStagger + flipDuration + 20);
  };
  selectBookPage = flipTo;


  cover.addEventListener('click', () => {
    const open = !book.classList.contains('is-open');
    book.classList.toggle('is-open', open);
    cover.setAttribute('aria-expanded', String(open));
    cover.setAttribute('aria-label', open ? 'Close the diary cover' : 'Open the diary');
    updateStack();
    if (!open) {
      closeBook();
    }
  });
  if (book.classList.contains('is-open')) {
    cover.setAttribute('aria-expanded', 'true');
    cover.setAttribute('aria-label', 'Close the diary cover');
  }
  book.addEventListener('click', (event) => {
    if (!book.classList.contains('is-open') || isAnimating || event.target.closest('#bookCover')) return;
    const link = event.target.closest('[data-page-target]');
    if (link) {
      event.preventDefault();
      flipTo(Number(link.dataset.pageTarget));
      return;
    }
    const midpoint = book.getBoundingClientRect().left + book.offsetWidth / 2;
    if (event.clientX < midpoint && currentPage === 0) {
      closeBook();
      return;
    }
    flipTo(currentPage + (event.clientX >= midpoint ? 1 : -1));
  });
  document.addEventListener('keydown', (event) => {
    if (previewDialog.open) return;
    if (event.key === 'Escape') {
      closeBook();
    }
    if (!book.classList.contains('is-open')) return;
    if (event.key === 'ArrowRight') flipTo(currentPage + 1);
    if (event.key === 'ArrowLeft') flipTo(currentPage - 1);
  });
  updateStack();
})();
