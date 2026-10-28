import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initAnchors } from './motion/anchors';
import { initBackground, initVisibility } from './motion/background';
import { env } from './motion/env';
import { initFaq } from './motion/faq';
import { initHeroBolt, initTilt } from './motion/hero';
import { initMenu } from './motion/menu';
import { initNav } from './motion/nav';
import { initCardGlow, initMagnetic } from './motion/pointer';
import { initReveals } from './motion/reveal';
import { initSmoothScroll } from './motion/smooth';
import { initSteps } from './motion/steps';
import { initTheme } from './motion/theme';
import { initScenes } from './scenes';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// Interaction that must work regardless of motion settings.
initTheme();
initAnchors();
initMenu();
initFaq();
initVisibility();

// Motion. Wait for fonts so line splits and pin distances are measured once.
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);

// Yield between setup steps so no single task blocks input for long.
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

fontsReady.then(async () => {
  initSmoothScroll();
  initNav();
  await yieldToMain();
  initReveals();
  await yieldToMain();
  initSteps();
  if (!env.reduced) {
    initBackground();
    initHeroBolt();
    initScenes();
    if (env.fine) {
      initTilt();
      initMagnetic();
      initCardGlow();
    }
  }
  await yieldToMain();
  ScrollTrigger.refresh();

  // Deep link on load (e.g. /#faq): re-apply the offset once layout is final.
  const target = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  if (target) {
    if (target instanceof HTMLDetailsElement) target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
});
