// src/client/utils/sounds.ts

class SoundManager {
  private music: HTMLAudioElement | null = null;
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  
  // Récupère la préférence utilisateur ou par défaut 'false' (non muet)
  public isMuted: boolean = localStorage.getItem('uno_muted') === 'true';
  public volume: number = 0.5;

  // Banque de sons (URLs CDN libres de droits pour l'exemple)
  private sources = {
    // SFX (Effets sonores)
    hover: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    play: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',
    draw: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3', // bruit papier
    uno: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3', // alerte
    win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // victoire
    lose: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3', // défaite
    join: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
    error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    
    // Musiques (Boucles)
    bgm_lobby: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3', // Chill Jazz
    bgm_game: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_349d445474.mp3'  // Funky Gaming
  };

  constructor() {
    // Précharger les SFX (création d'un "pool" pour jouer plusieurs sons en même temps)
    Object.entries(this.sources).forEach(([key, src]) => {
      if (key.startsWith('bgm_')) return; // On ne précharge pas les musiques ici
      
      const pool: HTMLAudioElement[] = [];
      for(let i=0; i<3; i++) {
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
      // Trouver un lecteur libre ou prendre le premier
      const audio = pool?.find(a => a.paused) || pool?.[0]; 
      if (audio) {
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.play().catch(() => {}); // Ignorer erreur autoplay si pas d'interaction
      }
    }
  }

  playMusic(key: 'bgm_lobby' | 'bgm_game') {
    if (this.isMuted) return;
    
    // Si la même musique joue déjà, on ne fait rien
    if (this.music && this.music.src === this.sources[key] && !this.music.paused) return;

    this.stopMusic();

    const src = this.sources[key];
    this.music = new Audio(src);
    this.music.loop = true; // Boucle infinie
    this.music.volume = this.volume * 0.6; // Musique un peu moins forte que les SFX
    
    this.music.play().catch(e => console.log("Autoplay bloqué, interaction requise"));
  }

  stopMusic() {
    if (this.music) {
      this.music.pause();
      this.music = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('uno_muted', String(this.isMuted));
    
    if (this.isMuted) {
      this.stopMusic();
    }
    // Si on unmute, c'est l'UI qui relancera la musique via playMusic
    return this.isMuted;
  }
}

export const audioManager = new SoundManager();

// Helper simple pour compatibilité
export const playSound = (key: string) => audioManager.play(key);