// src/client/utils/sounds.ts

class SoundManager {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  
  // Récupère la préférence utilisateur
  public isMuted: boolean = localStorage.getItem('uno_muted') === 'true';
  public volume: number = 0.5;

  // Banque de sons (SFX uniquement)
  private sources = {
    hover: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    play: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',
    draw: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',
    uno: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    lose: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
    join: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
    error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  };

  constructor() {
    // Précharger les SFX
    Object.entries(this.sources).forEach(([key, src]) => {
      const pool: HTMLAudioElement[] = [];
      for(let i=0; i<3; i++) { // Pool de 3 sons simultanés max
        const audio = new Audio(src);
        audio.volume = this.volume;
        pool.push(audio);
      }
      this.sounds.set(key, pool);
    });
  }

  play(key: string) {
    if (this.isMuted) return;

    if (this.sounds.has(key)) {
      const pool = this.sounds.get(key);
      const audio = pool?.find(a => a.paused) || pool?.[0]; 
      if (audio) {
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.play().catch(() => {});
      }
    }
  }

  // Méthodes vides pour compatibilité si appelées ailleurs, mais ne font plus rien
  playMusic(key: string) {}
  stopMusic() {}

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('uno_muted', String(this.isMuted));
    return this.isMuted;
  }
}

export const audioManager = new SoundManager();
export const playSound = (key: string) => audioManager.play(key);