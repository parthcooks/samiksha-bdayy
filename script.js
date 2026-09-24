const tiltElements = document.querySelectorAll(".tilt-layer");
const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
const orientationMedia = window.matchMedia("(orientation: landscape)");
const tiltBaseOptions = {
	max: 32,
	speed: 1400,
  scale: 1.04,
  transition: true,
  easing: "cubic-bezier(.03,.98,.52,.99)",
  perspective: 900,
  glare: true,
  gyroscope: true,
  gyroscopeMinAngleX: -18,
  gyroscopeMaxAngleX: 18,
  gyroscopeMinAngleY: -18,
  gyroscopeMaxAngleY: 18,
  gyroscopeSamples: 1
};

const portraitBounds = {
  gyroscopeMinAngleX: -16,
  gyroscopeMaxAngleX: 16,
  gyroscopeMinAngleY: -16,
  gyroscopeMaxAngleY: 16
};

const landscapeBounds = {
  gyroscopeMinAngleX: -24,
  gyroscopeMaxAngleX: 24,
  gyroscopeMinAngleY: -14,
  gyroscopeMaxAngleY: 14
};

let tiltInstances = [];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (start, end, t) => start + (end - start) * t;

const applyOrientationBounds = (isLandscape) => {
  const bounds = isLandscape ? landscapeBounds : portraitBounds;
  tiltInstances.forEach((instance) => {
    Object.assign(instance.settings, bounds);
    instance.gyroscopeSamples = 1;
    instance.gammazero = null;
    instance.betazero = null;
    instance.reset();
    const cardEl = instance.element;
    const cardFront = cardEl.querySelector('.card-front');
    if (cardFront) {
      cardFront.style.setProperty('--highlight-x', '50%');
      cardFront.style.setProperty('--highlight-y', '40%');
      cardFront.style.setProperty('--highlight-strength', '0.32');
    }
  });
};

const normalizeOrientationEvent = (event) => {
  if (event.beta === null || event.gamma === null) {
    return null;
  }

  const orientationAngle = (screen.orientation && typeof screen.orientation.angle === "number")
    ? screen.orientation.angle
    : (typeof window.orientation === "number" ? window.orientation : 0);

  const amplifiedBeta = clamp(event.beta * 1.6, -90, 90);
  const amplifiedGamma = clamp(event.gamma * 1.6, -90, 90);

  if (Math.abs(orientationAngle) === 90) {
    const sign = orientationAngle === 90 ? 1 : -1;
    return {
      alpha: event.alpha,
      beta: clamp(amplifiedGamma * sign, -90, 90),
      gamma: clamp(-amplifiedBeta * sign, -90, 90)
    };
  }

  return {
    alpha: event.alpha,
    beta: amplifiedBeta,
    gamma: amplifiedGamma
  };
};

const handleDeviceOrientation = (event) => {
  const normalized = normalizeOrientationEvent(event);
  if (!normalized) {
    return;
  }
  tiltInstances.forEach((instance) => {
    instance.onDeviceOrientation(normalized);
  });
};

const updateCardHighlight = (card, detail) => {
  if (!detail) {
    return;
  }

  const highlightX = clamp(lerp(20, 80, detail.percentageX / 100), 10, 90);
  const highlightY = clamp(lerp(25, 75, detail.percentageY / 100), 15, 85);
  const movement = (Math.abs(detail.tiltX) + Math.abs(detail.tiltY)) / (tiltBaseOptions.max * 1.5);
  const strength = clamp(0.22 + movement, 0.24, 0.55);

  card.style.setProperty('--highlight-x', `${highlightX}%`);
  card.style.setProperty('--highlight-y', `${highlightY}%`);
  card.style.setProperty('--highlight-strength', strength.toFixed(3));
};

const attachHighlightListeners = () => {
  tiltInstances.forEach((instance) => {
    const cardEl = instance.element;
    const cardFront = cardEl.querySelector('.card-front');
    if (!cardFront) {
      return;
    }

    cardFront.style.setProperty('--highlight-x', '50%');
    cardFront.style.setProperty('--highlight-y', '40%');
    cardFront.style.setProperty('--highlight-strength', '0.32');

    const handler = (event) => updateCardHighlight(cardFront, event.detail);
    cardEl.addEventListener('tiltChange', handler);
    instance.highlightHandler = handler;
  });
};

const initTilt = () => {
  VanillaTilt.init(tiltElements, tiltBaseOptions);
  tiltInstances = Array.from(tiltElements).map((element) => element.vanillaTilt);

  applyOrientationBounds(orientationMedia.matches);
  attachHighlightListeners();

  if (isCoarsePointer) {
    tiltInstances.forEach((instance) => {
      window.removeEventListener("deviceorientation", instance.onDeviceOrientationBind);
    });
    window.addEventListener("deviceorientation", handleDeviceOrientation, true);
  }
};

const requestGyroPermission = () => {
  const askPermission = (permissionRequestFn) => {
    permissionRequestFn()
      .catch(() => undefined)
      .finally(() => {
        window.removeEventListener('touchstart', onFirstInteraction);
        window.removeEventListener('click', onFirstInteraction);
      });
  };

  const onFirstInteraction = () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      askPermission(() => DeviceOrientationEvent.requestPermission());
    } else if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      askPermission(() => DeviceMotionEvent.requestPermission());
    } else {
      window.removeEventListener('touchstart', onFirstInteraction);
      window.removeEventListener('click', onFirstInteraction);
    }
  };

  window.addEventListener('touchstart', onFirstInteraction, { once: true });
  window.addEventListener('click', onFirstInteraction, { once: true });
};

if ('DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window) {
  requestGyroPermission();
}

initTilt();
orientationMedia.addEventListener("change", (event) => {
  applyOrientationBounds(event.matches);
});

// Card flip functionality
const card = document.querySelector('.card');
const giftCodeElement = document.getElementById('gift-code');
const copyBtn = document.getElementById('copy-btn');

// Replace with your actual Google Play code
const GOOGLE_PLAY_CODE = '42KW9VSAD925KFVN';

// Set the code
giftCodeElement.textContent = GOOGLE_PLAY_CODE;

// Double-tap detection
let lastTap = 0;
let tapTimeout;

const handleDoubleTap = (e) => {
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  
  if (tapLength < 300 && tapLength > 0) {
    e.preventDefault();
    flipCard();
    clearTimeout(tapTimeout);
  } else {
    tapTimeout = setTimeout(() => {
      lastTap = 0;
    }, 300);
  }
  
  lastTap = currentTime;
};

// Touch events for mobile
card.addEventListener('touchend', handleDoubleTap);

// Click events for desktop (double-click)
card.addEventListener('dblclick', (e) => {
  e.preventDefault();
  flipCard();
});

// Prevent single click from triggering tilt reset when waiting for double-tap
card.addEventListener('click', (e) => {
  if (e.detail === 1) {
    setTimeout(() => {
      if (e.detail === 1) {
        // Single click - do nothing or allow tilt
      }
    }, 300);
  }
});

const flipCard = () => {
  card.classList.toggle('flipped');
};

// Copy to clipboard functionality
copyBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  
  const codeToCopy = giftCodeElement.textContent.trim();
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(codeToCopy);
      showCopyFeedback();
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = codeToCopy;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showCopyFeedback();
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.error('Copy failed:', err);
  }
});

const showCopyFeedback = () => {
  copyBtn.textContent = 'Copied!';
  copyBtn.classList.add('copied');
  
  setTimeout(() => {
    copyBtn.textContent = 'Copy Code';
    copyBtn.classList.remove('copied');
  }, 2000);
};

let confettiGenerator;

const setupConfetti = () => {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    return;
  }

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();

  const confettiSettings = {
    target: canvas,
    max: "128",
    size: "1",
    animate: true,
    props: ["circle", "square", "triangle", "line"],
    colors: [[255, 182, 193], [255, 192, 203], [255, 160, 200], [165, 104, 246]],
    clock: "16",
    rotate: true,
    width: "",
    height: "",
    start_from_edge: false,
    respawn: true
  };

  confettiGenerator = new ConfettiGenerator(confettiSettings);
};

const startConfetti = () => {
  if (confettiGenerator && typeof confettiGenerator.render === "function") {
    confettiGenerator.render();
  }
};

const musicElement = document.getElementById('bg-music');
let musicStarted = false;

const tryPlayMusic = async () => {
  if (!musicElement || musicStarted) {
    return;
  }

  try {
    await musicElement.play();
    musicStarted = true;
  } catch (err) {
    // Autoplay might be blocked; wait for explicit interaction
  }
};

const setupMusicAutoplay = () => {
  if (!musicElement) {
    return;
  }

  const resumeMusic = async () => {
    await tryPlayMusic();
    if (musicStarted) {
      window.removeEventListener('touchend', resumeMusic);
      window.removeEventListener('click', resumeMusic);
    }
  };

  window.addEventListener('touchend', resumeMusic, { passive: true });
  window.addEventListener('click', resumeMusic, { passive: true });

  tryPlayMusic();
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const introMessages = [
  "27 varsha chi zhalis lmfao",
  "ghodi",
  "but ngl you're inspirational",
  "i love you so much",
  "anyways"
];

const introOverlay = document.getElementById('intro-overlay');
const introText = document.querySelector('.intro-text');
const cardWrapper = document.querySelector('.card-wrapper');

const introWordGapMs = 450;
const introHoldMs = 1600;

const renderIntroMessage = (message) => {
  if (!introText) {
    return [];
  }

  introText.innerHTML = '';
  const words = message.split(/\s+/).filter(Boolean);

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'intro-word';
    span.textContent = word;
    span.style.animationDelay = `${(index * introWordGapMs) / 1000}s`;
    introText.appendChild(span);

    if (index < words.length - 1) {
      introText.append(' ');
    }
  });

  return words;
};

const showIntroMessage = async (message) => {
  if (!introOverlay || !introText) {
    return;
  }

  const words = renderIntroMessage(message);
  introOverlay.classList.add('visible');

  const messageDuration = words.length * introWordGapMs + introHoldMs;
  await wait(messageDuration);

  introOverlay.classList.remove('visible');
  await wait(900);
};

const playIntroSequence = async () => {
  if (!cardWrapper) {
    startConfetti();
    return;
  }

  if (introOverlay && introText) {
    await wait(600);

    for (const message of introMessages) {
      await showIntroMessage(message);
    }

    introOverlay.classList.remove('visible');
    setTimeout(() => {
      if (introOverlay) {
        introOverlay.style.display = 'none';
      }
      if (introText) {
        introText.innerHTML = '';
      }
    }, 900);
  }

  cardWrapper.classList.remove('card-hidden');
  cardWrapper.classList.add('card-visible');

  await wait(150);
  startConfetti();
};

setupConfetti();
setupMusicAutoplay();
playIntroSequence();
