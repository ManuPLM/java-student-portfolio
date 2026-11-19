(() => {
  let muted = false;
  let context;
  let ambience;
  const storageKey = 'wk-mute';

  try {
    muted = localStorage.getItem(storageKey) === '1';
  } catch (error) {
    muted = false;
  }

  const audioContext = () => context
    || (context = new (window.AudioContext || window.webkitAudioContext)());

  const noise = (duration, startFrequency, endFrequency, volume) => {
    const audio = audioContext();
    const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }

    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFrequency, audio.currentTime);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, audio.currentTime + duration);
    const gain = audio.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
  };

  const tone = (frequency, duration, type, volume, endFrequency) => {
    const audio = audioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  };

  const startAmbience = () => {
    if (muted || ambience) return;
    const audio = audioContext();
    const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.7;
    }

    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.linearRampToValueAtTime(0.022, audio.currentTime + 1.5);
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
    ambience = { source, gain };
  };

  const stopAmbience = () => {
    if (!ambience) return;
    const audio = audioContext();
    const current = ambience;
    current.gain.gain.cancelScheduledValues(audio.currentTime);
    current.gain.gain.setTargetAtTime(0, audio.currentTime, 0.08);
    current.source.stop(audio.currentTime + 0.35);
    ambience = null;
  };

  const soundEffects = {
    flip: () => {
      noise(0.28, 1400, 4200, 0.16);
      tone(180, 0.18, 'triangle', 0.04, 90);
    },
    open: () => {
      tone(110, 0.3, 'sine', 0.18, 50);
      noise(0.55, 500, 1800, 0.13);
    },
    scratch: () => noise(0.12, 2500, 4500, 0.06)
  };

  const play = (name) => {
    if (muted) return;
    try {
      const audio = audioContext();
      audio.resume();
      startAmbience();
      soundEffects[name]();
    } catch (error) {
      // Audio is optional and may be unavailable in older browsers.
    }
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.closest('#bookCover')) {
      play('open');
    } else if (target.closest('.member-link,.book-controls button,[data-page-target],.bookmark,.ribbon,.page-nav a')) {
      play('flip');
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') play('flip');
  });

  let lastScratch = 0;
  document.addEventListener('mouseover', (event) => {
    if (event.target.closest && event.target.closest('.member-link')
      && Date.now() - lastScratch > 250) {
      lastScratch = Date.now();
      play('scratch');
    }
  });

  addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const addEffect = (className, html = '') => {
      const element = document.createElement('div');
      element.className = `fx ${className}`;
      element.setAttribute('aria-hidden', 'true');
      element.innerHTML = html;
      body.appendChild(element);
    };

    addEffect('plane', "<svg viewBox='0 0 70 40' fill='#fffef6' stroke='#17202b' stroke-width='2' stroke-linejoin='round'><path d='M2 20L68 3 40 37 32 24z'/><path d='M32 24L68 3' /></svg>");
    addEffect('sticky', 'TO DO:<br>• nothing<br>• panic<br>• snack');
    addEffect('cheese');
    addEffect('ball');

    const toggle = document.createElement('button');
    toggle.className = 'sound-toggle';
    toggle.type = 'button';
    const updateToggle = () => {
      toggle.textContent = muted ? '🔇' : '🔊';
      toggle.setAttribute('aria-pressed', String(!muted));
      toggle.setAttribute('aria-label', muted ? 'Turn school sounds on' : 'Turn school sounds off');
      toggle.title = muted ? 'School sounds off' : 'School sounds on';
    };
    updateToggle();
    toggle.onclick = () => {
      muted = !muted;
      try {
        localStorage.setItem(storageKey, muted ? '1' : '0');
      } catch (error) {
        // Audio preferences do not affect page functionality.
      }
      if (muted) stopAmbience();
      updateToggle();
      if (!muted) play('open');
    };
    body.appendChild(toggle);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAmbience();
      else if (!muted && context) startAmbience();
    });

    const scene = document.querySelector('.book-scene');
    if (scene) {
      const mat = document.createElement('div');
      mat.className = 'mat';
      mat.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('.fx.sticky,.fx.cheese,.fx.ball')
        .forEach((element) => mat.appendChild(element));
      scene.prepend(mat);
    }
  });
})();

(() => {
  document.addEventListener('click', (event) => {
    if (event.target.closest('.paper-page a[target=_blank]')) event.stopPropagation();
  }, true);

  document.addEventListener('click', (event) => {
    const ribbon = event.target.closest('.ribbon');
    if (!ribbon) return;
    event.preventDefault();
    const book = document.getElementById('portfolioBook');
    const cover = document.getElementById('bookCover');
    if (!book || !cover) return;

    const go = () => {
      const link = document.querySelector(`.member-link[data-page-target="${ribbon.dataset.go}"]`);
      if (link) link.click();
    };

    if (book.classList.contains('is-open')) go();
    else {
      cover.click();
      setTimeout(go, 450);
    }
  });
})();
