(() => {
  const book = document.getElementById('portfolioBook');
  const cover = document.getElementById('bookCover');
  if (!book || !cover) return;

  const leaves = [...book.querySelectorAll('.page-leaf')];
  const pageStack = book.querySelector('.page-stack');
  const scene = book.closest('.book-scene');
  let currentPage = 0;
  let isAnimating = false;
  const flipDuration = 1150;
  const pageStagger = 80;

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
    if (event.target.closest('.intro-page')) {
      flipTo(1);
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
    if (event.key === 'Escape') {
      closeBook();
    }
    if (!book.classList.contains('is-open')) return;
    if (event.key === 'ArrowRight') flipTo(currentPage + 1);
    if (event.key === 'ArrowLeft') flipTo(currentPage - 1);
  });
  updateStack();
})();
