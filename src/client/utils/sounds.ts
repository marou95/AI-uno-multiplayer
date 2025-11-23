import { Howl } from 'howler';

// In a real project, these would point to actual assets in /public
// For this demo, we use placeholders or simple beeps if files missing.
// You can download generic free SFX and place them in /public/sounds/

const sounds = {
  play: new Howl({ src: ['/sounds/play.mp3'], volume: 0.5 }),
  draw: new Howl({ src: ['/sounds/draw.mp3'], volume: 0.5 }),
  uno: new Howl({ src: ['/sounds/uno.mp3'], volume: 0.8 }),
  win: new Howl({ src: ['/sounds/win.mp3'], volume: 0.8 }),
  turn: new Howl({ src: ['/sounds/turn.mp3'], volume: 0.4 }),
  error: new Howl({ src: ['/sounds/error.mp3'], volume: 0.3 })
};

export const playSound = (key: keyof typeof sounds) => {
  try {
    sounds[key].play();
  } catch (e) {
    console.warn("Sound play failed", e);
  }
};