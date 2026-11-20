(() => {
  if (window.__m4MusicPlayerReady) return;
  window.__m4MusicPlayerReady = true;

  const playlistIds = [
    'PLLgY1rWC4NyPiF1ljT5FrhhZraW6fvxkb',
    'PLLgY1rWC4NyNC-PbbfDX2CHjPhnts1mcm'
  ];
  const playlistItemsEndpoint = 'https://www.googleapis.com/youtube/v3/playlistItems';
  let playlistCollectionPromise = null;
  let iframeApiPromise = null;

  const formatError = (error) => error instanceof Error ? error.message : String(error);

  const fetchPlaylistTracks = async (playlistId, apiKey) => {
    const tracks = [];
    let pageToken = '';

    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        maxResults: '50',
        playlistId,
        key: apiKey
      });
      if (pageToken) params.set('pageToken', pageToken);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(`${playlistItemsEndpoint}?${params.toString()}`, {
          signal: controller.signal
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('YouTube playlist request timed out.');
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('YouTube returned an unreadable playlist response.');
      }

      if (!response.ok) {
        throw new Error(payload?.error?.message || `YouTube Data API returned HTTP ${response.status}.`);
      }
      if (!payload || !Array.isArray(payload.items)) {
        throw new Error('YouTube returned an invalid playlist response.');
      }

      payload.items.forEach((item) => {
        const title = item?.snippet?.title?.trim() || '';
        const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
        if (!videoId || !title || /^(deleted|private) video$/i.test(title)) return;

        tracks.push({
          videoId,
          title,
          artist: item?.snippet?.videoOwnerChannelTitle?.trim() || '',
          playlistId
        });
      });

      pageToken = payload.nextPageToken || '';
    } while (pageToken);

    return tracks;
  };

  const loadPlaylistCollection = (apiKey) => {
    if (!playlistCollectionPromise) {
      playlistCollectionPromise = Promise.allSettled(
        playlistIds.map((playlistId) => fetchPlaylistTracks(playlistId, apiKey))
      ).then((results) => {
        const tracks = [];
        const warnings = [];
        const seenVideoIds = new Set();

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            warnings.push(`Playlist ${index + 1}: ${formatError(result.reason)}`);
            return;
          }
          result.value.forEach((track) => {
            if (seenVideoIds.has(track.videoId)) return;
            seenVideoIds.add(track.videoId);
            tracks.push(track);
          });
        });

        if (!tracks.length) {
          const reason = warnings.length
            ? warnings.join(' ')
            : 'The playlists contain no available videos.';
          throw new Error(`Could not load playable playlist tracks. ${reason}`);
        }

        return { tracks, warnings };
      }).catch((error) => {
        playlistCollectionPromise = null;
        throw error;
      });
    }

    return playlistCollectionPromise;
  };

  const loadIframeApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (iframeApiPromise) return iframeApiPromise;

    iframeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      const script = existingScript || document.createElement('script');
      const restoreCallback = () => {
        if (window.onYouTubeIframeAPIReady === readyCallback) {
          window.onYouTubeIframeAPIReady = previousCallback;
        }
      };
      const readyCallback = () => {
        try {
          if (typeof previousCallback === 'function') previousCallback();
          if (!window.YT?.Player) {
            throw new Error('The YouTube player API did not initialize.');
          }
          restoreCallback();
          resolve(window.YT);
        } catch (error) {
          restoreCallback();
          reject(error);
        }
      };

      window.onYouTubeIframeAPIReady = readyCallback;
      script.addEventListener('error', () => {
        restoreCallback();
        reject(new Error('Could not load the YouTube IFrame Player API.'));
      }, { once: true });

      if (!existingScript) {
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.append(script);
      }
    }).catch((error) => {
      iframeApiPromise = null;
      throw error;
    });

    return iframeApiPromise;
  };

  const initializedRoots = new WeakSet();
  const musicPlayerControllers = new WeakMap();
  let playerIndex = 0;

  const initializeMusicPlayer = (root) => {
    if (initializedRoots.has(root)) return;
    const apiKey = root.dataset.youtubeApiKey?.trim() || '';
    const startButton = root.querySelector('[data-music-start]');
    const panel = root.querySelector('[data-music-panel]');
    const frame = root.querySelector('[data-music-frame]');
    const collapseButton = root.querySelector('[data-music-collapse]');
    const title = root.querySelector('[data-music-title]');
    const artist = root.querySelector('[data-music-artist]');
    const status = root.querySelector('[data-music-status]');
    const playButton = root.querySelector('[data-music-play]');
    const randomizeButton = root.querySelector('[data-music-random]');
    const openLink = root.querySelector('[data-music-open]');

    if (!startButton || !panel || !frame || !collapseButton || !title || !artist || !status ||
      !playButton || !randomizeButton || !openLink) return;

    initializedRoots.add(root);
    const index = playerIndex++;
    panel.id = `m4-music-panel-${index}`;
    collapseButton.setAttribute('aria-controls', panel.id);
    const initialTrack = root.dataset.currentVideoId
      ? {
          videoId: root.dataset.currentVideoId,
          title: root.dataset.currentTitle || 'Current song',
          artist: root.dataset.currentArtist || '',
          playlistId: root.dataset.currentPlaylistId || ''
        }
      : null;
    let playerHost = frame.querySelector('[data-music-player-host]');
    if (initialTrack || !playerHost) {
      playerHost = document.createElement('div');
      playerHost.className = 'm4-music-player-host';
      playerHost.dataset.musicPlayerHost = '';
      frame.replaceChildren(playerHost);
    }

    let tracks = [];
    let currentTrack = initialTrack;
    let failedVideoIds = new Set();
    let player = null;
    let playerReady = false;
    let playerState = -1;
    let loadedVideoId = null;
    let playerInitPromise = null;
    let loadingTracks = false;
    let playlistWarning = '';
    let cueInitialTrack = Boolean(initialTrack);
    let hasRandomizedTrack = Boolean(initialTrack);
    collapseButton.disabled = !hasRandomizedTrack;
    collapseButton.setAttribute('aria-expanded', String(hasRandomizedTrack));
    collapseButton.setAttribute('aria-label', `${hasRandomizedTrack ? 'Minimize' : 'Maximize'} On repeat card`);
    collapseButton.textContent = hasRandomizedTrack ? '−' : '+';

    collapseButton.addEventListener('click', () => {
      if (!hasRandomizedTrack) return;
      resetToDefault();
      const previewPage = root.closest('.page-preview-sheet');
      if (previewPage?.__previewSourcePage) {
        window.syncM4MusicPreview?.(previewPage, previewPage.__previewSourcePage);
      }
    });

    const setStatus = (message, isError = false) => {
      status.textContent = playlistWarning ? `${playlistWarning} ${message}` : message;
      status.classList.toggle('is-error', isError);
      status.setAttribute('role', isError ? 'alert' : 'status');
    };

    const resetToDefault = () => {
      if (player && playerReady && currentTrack) {
        try {
          player.stopVideo();
        } catch (error) {
          console.error('Could not stop the current YouTube song.', error);
          setStatus(`Could not stop the current song: ${formatError(error)}`, true);
        }
      }

      currentTrack = null;
      hasRandomizedTrack = false;
      playerState = -1;
      loadedVideoId = null;
      cueInitialTrack = false;
      delete root.dataset.currentVideoId;
      delete root.dataset.currentTitle;
      delete root.dataset.currentArtist;
      delete root.dataset.currentPlaylistId;
      title.textContent = 'Waiting for a song';
      artist.textContent = '';
      artist.hidden = true;
      openLink.hidden = true;
      playButton.disabled = true;
      randomizeButton.disabled = true;
      panel.hidden = true;
      startButton.hidden = false;
      collapseButton.disabled = true;
      collapseButton.setAttribute('aria-expanded', 'false');
      collapseButton.setAttribute('aria-label', 'Maximize On repeat card');
      collapseButton.textContent = '+';
      setStatus('Loading playlist tracks…');
    };

    const updatePlayButton = () => {
      const playing = playerState === window.YT?.PlayerState?.PLAYING;
      playButton.textContent = playing ? 'Pause' : 'Play';
      playButton.setAttribute('aria-label', playing ? 'Pause current song' : 'Play current song');
      playButton.setAttribute('aria-pressed', String(playing));
      playButton.disabled = !playerReady || !currentTrack;
    };

    const showTrack = (track) => {
      currentTrack = track;
      hasRandomizedTrack = true;
      startButton.hidden = true;
      panel.hidden = false;
      collapseButton.disabled = false;
      collapseButton.setAttribute('aria-expanded', 'true');
      collapseButton.setAttribute('aria-label', 'Minimize On repeat card');
      collapseButton.textContent = '−';
      root.dataset.currentVideoId = track.videoId;
      root.dataset.currentTitle = track.title;
      root.dataset.currentArtist = track.artist;
      root.dataset.currentPlaylistId = track.playlistId;
      title.textContent = track.title;
      artist.textContent = track.artist ? `Artist / channel: ${track.artist}` : '';
      artist.hidden = !track.artist;
      openLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(track.videoId)}`;
      openLink.hidden = false;
      playerState = -1;
      updatePlayButton();
    };

    const chooseRandomTrack = (retryFailed = false) => {
      if (retryFailed && tracks.length && failedVideoIds.size >= tracks.length) {
        failedVideoIds = new Set();
      }

      const available = tracks.filter((track) =>
        !failedVideoIds.has(track.videoId) && track.videoId !== currentTrack?.videoId
      );
      const pool = available.length
        ? available
        : tracks.filter((track) => !failedVideoIds.has(track.videoId));

      if (!pool.length) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const loadCurrentTrack = () => {
      if (!playerReady || !player || !currentTrack || loadedVideoId === currentTrack.videoId) return;
      loadedVideoId = currentTrack.videoId;
      setStatus(`Loading “${currentTrack.title}”…`);
      try {
        player.loadVideoById(currentTrack.videoId);
      } catch (error) {
        loadedVideoId = null;
        setStatus(`Could not start this video: ${formatError(error)}`, true);
      }
    };

    const handlePlayerError = (event) => {
      if (!currentTrack) return;
      failedVideoIds.add(currentTrack.videoId);
      loadedVideoId = null;
      const nextTrack = chooseRandomTrack();
      if (!nextTrack) {
        currentTrack = null;
        playerState = -1;
        setStatus('No playable videos remain in these playlists. Use Randomize to try again.', true);
        updatePlayButton();
        randomizeButton.disabled = false;
        return;
      }

      setStatus(`This video is unavailable in the player (error ${event.data}); trying another song.`);
      showTrack(nextTrack);
      loadCurrentTrack();
    };

    const handlePlayerStateChange = (event) => {
      playerState = event.data;
      updatePlayButton();
      if (!currentTrack) return;

      const states = window.YT.PlayerState;
      if (event.data === states.PLAYING) {
        setStatus(`Now playing: ${currentTrack.title}`);
      } else if (event.data === states.PAUSED) {
        setStatus(`Paused: ${currentTrack.title}`);
      } else if (event.data === states.BUFFERING) {
        setStatus(`Buffering: ${currentTrack.title}`);
      } else if (event.data === states.ENDED) {
        setStatus('Song finished. Randomize to pick another.');
      } else if (event.data === states.CUED) {
        setStatus('Ready. Press Play if playback did not start automatically.');
      }
    };

    const ensurePlayer = () => {
      if (player) return Promise.resolve();
      if (playerInitPromise) return playerInitPromise;

      playerInitPromise = loadIframeApi().then((youtube) => {
        playerHost.id = `m4-youtube-player-${index}`;
        player = new youtube.Player(playerHost.id, {
          width: '420',
          height: '200',
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              playerReady = true;
              event.target.getIframe().title = 'YouTube music player';
              updatePlayButton();
              if (cueInitialTrack && currentTrack) {
                loadedVideoId = currentTrack.videoId;
                try {
                  event.target.cueVideoById(currentTrack.videoId);
                } catch (error) {
                  loadedVideoId = null;
                  setStatus(`Could not load this video in the player: ${formatError(error)}`, true);
                }
              } else {
                loadCurrentTrack();
              }
            },
            onStateChange: handlePlayerStateChange,
            onError: handlePlayerError
          }
        });
      }).catch((error) => {
        playerInitPromise = null;
        throw error;
      });

      return playerInitPromise;
    };

    const playSelectedTrack = async (track) => {
      showTrack(track);
      loadedVideoId = null;
      cueInitialTrack = false;
      setStatus(`Preparing “${track.title}”…`);
      await ensurePlayer();
      loadCurrentTrack();
    };

    musicPlayerControllers.set(root, async (track) => {
      if (!track) {
        resetToDefault();
        return;
      }
      startButton.hidden = true;
      panel.hidden = false;
      if (currentTrack?.videoId === track.videoId && loadedVideoId === track.videoId) return;
      try {
        await playSelectedTrack(track);
      } catch (error) {
        setStatus(`Could not sync the selected song: ${formatError(error)}`, true);
      }
    });

    const chooseAndPlay = async (retryFailed = false) => {
      if (loadingTracks) return;
      if (!apiKey) {
        setStatus('YouTube API key is not configured. Set YOUTUBE_API_KEY and restart the app.', true);
        randomizeButton.disabled = false;
        return;
      }

      loadingTracks = true;
      randomizeButton.disabled = true;
      setStatus('Loading tracks from both playlists…');

      try {
        if (!tracks.length) {
          const collection = await loadPlaylistCollection(apiKey);
          tracks = collection.tracks;
          playlistWarning = collection.warnings.length
            ? `Some playlist data could not be loaded: ${collection.warnings.join(' ')}`
            : '';
        }

        const track = chooseRandomTrack(retryFailed);
        if (!track) {
          setStatus('No playable videos were found. The playlists may be empty or contain private or deleted videos.', true);
          randomizeButton.disabled = false;
          return;
        }

        loadingTracks = false;
        randomizeButton.disabled = false;
        await playSelectedTrack(track);
      } catch (error) {
        setStatus(`Could not load or play playlist tracks: ${formatError(error)}`, true);
        randomizeButton.disabled = false;
      } finally {
        loadingTracks = false;
        randomizeButton.disabled = false;
      }
    };

    root.addEventListener('click', (event) => {
      const control = event.target instanceof Element ? event.target.closest('button, a') : null;
      if (control && root.contains(control)) {
        event.stopPropagation();
        return;
      }
      if (panel.hidden) {
        event.stopPropagation();
        startButton.click();
      }
    });

    startButton.addEventListener('click', () => {
      startButton.hidden = true;
      panel.hidden = false;
      chooseAndPlay();
    });

    playButton.addEventListener('click', () => {
      if (!playerReady || !player) return;
      try {
        if (playerState === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } catch (error) {
        setStatus(`Playback control failed: ${formatError(error)}`, true);
      }
    });

    randomizeButton.addEventListener('click', () => chooseAndPlay(true));

    if (initialTrack) {
      setStatus(`Preparing “${initialTrack.title}”…`);
      ensurePlayer().catch((error) => {
        setStatus(`Could not load or play playlist tracks: ${formatError(error)}`, true);
      });
    }
  };

  window.initializeM4MusicPlayers = (scope = document) => {
    if (scope.matches?.('[data-m4-music]')) initializeMusicPlayer(scope);
    scope.querySelectorAll?.('[data-m4-music]').forEach(initializeMusicPlayer);
  };
  window.syncM4MusicPreview = (previewPage, originalPage) => {
    const previewRoot = previewPage?.matches?.('[data-m4-music]')
      ? previewPage
      : previewPage?.querySelector?.('[data-m4-music]');
    const originalRoot = originalPage?.matches?.('[data-m4-music]')
      ? originalPage
      : originalPage?.querySelector?.('[data-m4-music]');
    if (!previewRoot || !originalRoot) return;

    const syncTrack = musicPlayerControllers.get(originalRoot);
    if (!syncTrack) return;
    if (!previewRoot.dataset.currentVideoId) {
      syncTrack(null);
      return;
    }
    syncTrack({
      videoId: previewRoot.dataset.currentVideoId,
      title: previewRoot.dataset.currentTitle || 'Current song',
      artist: previewRoot.dataset.currentArtist || '',
      playlistId: previewRoot.dataset.currentPlaylistId || ''
    });
  };
  window.initializeM4MusicPlayers();
})();
