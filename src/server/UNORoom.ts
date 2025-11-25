import { Room, Client, Delayed } from "colyseus";
import { UNOState, Player, Card } from "./schema/UNOState";
import { CardColor, CardType, GameStatus } from "../shared/types";

export class UNORoom extends Room<UNOState> {
  maxClients = 6;
  playerIndexes: string[] = [];
  unoPenaltyTimeout: Delayed | null = null;

  async onCreate(options: any) {
    console.log(`🏗️ Creating room... ID: ${this.roomId}`);
    
    // 1. Initialiser le State
    this.setState(new UNOState());
    this.playerIndexes = []; 
    
    // 2. Générer le Code Public
    const code = this.generateRoomCode();
    this.state.roomCode = code; // <--- Si UNOState n'a pas @type("string") roomCode, ça peut planter ici
    
    // 3. Metadata pour le matchmaking (API lookup)
    // On attend que cela soit fait avant de continuer
    await this.setMetadata({ roomCode: code });
    
    console.log(`✅ Room ready: ${this.roomId} | Code: ${code}`);

    // --- Gestionnaires de messages ---

    this.onMessage("setInfo", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (player) player.name = data.name || "Guest";
    });

    this.onMessage("toggleReady", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      const player = this.state.players.get(client.sessionId);
      if (player) player.isReady = !player.isReady;
    });

    this.onMessage("startGame", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      const readyCount = Array.from(this.state.players.values()).filter((p: Player) => p.isReady).length;
      // Pour debug facile, on autorise le start seul si besoin, sinon mettre >= 2
      if (readyCount >= 1 && readyCount === this.state.players.size) {
        this.startGame();
      }
    });

    this.onMessage("restartGame", (client: Client) => {
        if (this.state.status === GameStatus.FINISHED) {
            this.resetGame();
        }
    });

    this.onMessage("playCard", (client: Client, data: { cardId: string, chooseColor?: CardColor }) => {
      this.handlePlayCard(client, data.cardId, data.chooseColor);
    });

    this.onMessage("drawCard", (client: Client) => {
      this.handleDrawCard(client);
    });

    this.onMessage("sayUno", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
         // Autoriser UNO si on a 2 cartes ou moins (juste avant de jouer ou après avoir pioché)
         if (player.hand.length <= 2) {
            player.hasSaidUno = true;
            this.broadcast("notification", `${player.name} shouted UNO!`);
         }

         // Sauvetage
         if (this.state.pendingUnoPenaltyPlayerId === client.sessionId) {
            this.state.pendingUnoPenaltyPlayerId = "";
            if (this.unoPenaltyTimeout) {
                this.unoPenaltyTimeout.clear();
                this.unoPenaltyTimeout = null;
            }
            this.broadcast("notification", `${player.name} saved themselves!`);
         }
      }
    });

    this.onMessage("catchUno", (client: Client) => {
        const culpritId = this.state.pendingUnoPenaltyPlayerId;
        if (!culpritId) return;
        if (culpritId === client.sessionId) return; 

        const culprit = this.state.players.get(culpritId);
        const catcher = this.state.players.get(client.sessionId);

        if (culprit && catcher) {
            this.broadcast("notification", `🚨 ${catcher.name} CAUGHT ${culprit.name}! (+2 cards)`);
            this.moveCardFromDrawToHand(culprit);
            this.moveCardFromDrawToHand(culprit);
            culprit.hasSaidUno = false;
            this.state.pendingUnoPenaltyPlayerId = "";
            if (this.unoPenaltyTimeout) {
                this.unoPenaltyTimeout.clear();
                this.unoPenaltyTimeout = null;
            }
        }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Joining: ${client.sessionId}`);
    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.name = options.name || "Guest";
    this.state.players.set(client.sessionId, player);
    this.playerIndexes.push(client.sessionId);
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isConnected = false;
      // Si on est dans le lobby, on supprime direct
      if (this.state.status === GameStatus.LOBBY) {
        this.state.players.delete(client.sessionId);
        this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
      } else {
        // En jeu, on tente une reconnexion
        try {
          if (consented) throw new Error("Consented leave");
          await this.allowReconnection(client, 30); // 30 secondes pour revenir
          player.isConnected = true;
        } catch (e) {
          this.state.players.delete(client.sessionId);
          this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
          this.broadcast("notification", `${player.name} left.`);
          
          // Si plus assez de joueurs, reset
          if (this.state.players.size < 2) {
             this.resetGame(); // Retour au lobby
             this.broadcast("notification", "Game reset (player left).");
          }
        }
      }
    }
  }

  startGame() {
    this.state.status = GameStatus.PLAYING;
    this.createDeck();
    this.shuffleDeck();
    
    this.playerIndexes.forEach(sessionId => {
      const player = this.state.players.get(sessionId);
      if (player) {
        player.hand.clear();
        for (let i = 0; i < 7; i++) {
          this.moveCardFromDrawToHand(player);
        }
        player.cardsRemaining = 7;
        player.hasSaidUno = false;
      }
    });

    const firstCard = this.state.drawPile.pop();
    if (firstCard) {
      this.state.discardPile.push(firstCard);
      this.updateCurrentState(firstCard);
      if (firstCard.color === 'black') {
        this.state.currentColor = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
      }
    }

    this.state.currentTurnPlayerId = this.playerIndexes[0];
  }

  resetGame() {
    this.broadcast("notification", "🔄 Returning to Lobby...");
    this.state.status = GameStatus.LOBBY;
    this.state.winner = "";
    this.state.direction = 1;
    this.state.drawStack = 0;
    this.state.currentColor = "";
    this.state.currentType = "";
    this.state.currentValue = -1;
    this.state.pendingUnoPenaltyPlayerId = "";
    
    this.state.drawPile.clear();
    this.state.discardPile.clear();

    this.state.players.forEach(player => {
        player.hand.clear();
        player.cardsRemaining = 0;
        player.isReady = false; 
        player.hasSaidUno = false;
    });

    if (this.unoPenaltyTimeout) {
        this.unoPenaltyTimeout.clear();
        this.unoPenaltyTimeout = null;
    }
  }

  handlePlayCard(client: Client, cardId: string, chooseColor?: CardColor) {
    if (this.state.currentTurnPlayerId !== client.sessionId) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const card = player.hand[cardIndex];

    if (!this.isValidMove(card)) {
      client.send("error", "Invalid move");
      return;
    }

    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);
    player.cardsRemaining = player.hand.length;
    
    // Si on tombe à 1 carte et qu'on n'a pas dit UNO, pénalité en attente
    if (player.hand.length === 1 && !player.hasSaidUno) {
        this.state.pendingUnoPenaltyPlayerId = player.sessionId;
        if (this.unoPenaltyTimeout) this.unoPenaltyTimeout.clear();
        this.unoPenaltyTimeout = this.clock.setTimeout(() => {
            this.state.pendingUnoPenaltyPlayerId = "";
            this.unoPenaltyTimeout = null;
        }, 3000); 
    } else {
        if (this.state.pendingUnoPenaltyPlayerId === player.sessionId) {
            this.state.pendingUnoPenaltyPlayerId = "";
            if (this.unoPenaltyTimeout) this.unoPenaltyTimeout.clear();
        }
    }
    
    if (player.hand.length === 0) {
        this.state.winner = player.name;
        this.state.status = GameStatus.FINISHED;
        return;
    }

    if (player.hand.length > 1) {
        player.hasSaidUno = false;
    }

    if (card.color === 'black') {
      if (chooseColor) this.state.currentColor = chooseColor;
    } else {
      this.state.currentColor = card.color;
    }
    this.state.currentType = card.type;
    this.state.currentValue = card.value;

    let skipNext = false;
    switch (card.type) {
      case 'reverse':
        if (this.playerIndexes.length === 2) skipNext = true;
        else this.state.direction *= -1;
        break;
      case 'skip': skipNext = true; break;
      case 'draw2': this.state.drawStack += 2; break;
      case 'wild4': this.state.drawStack += 4; break;
    }

    this.advanceTurn(skipNext);
  }

  handleDrawCard(client: Client) {
    if (this.state.currentTurnPlayerId !== client.sessionId) return;
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (this.state.drawStack > 0) {
       for(let i=0; i<this.state.drawStack; i++) this.moveCardFromDrawToHand(player);
       this.broadcast("notification", `${player.name} drew ${this.state.drawStack} cards!`);
       this.state.drawStack = 0;
       player.hasSaidUno = false; 
       this.advanceTurn(false);
       return;
    }

    const newCard = this.moveCardFromDrawToHand(player);
    player.hasSaidUno = false; 
    
    if (newCard && !this.isValidMove(newCard)) {
       this.advanceTurn(false);
    } else {
       client.send("notification", "Playable card drawn!");
    }
  }

  isValidMove(card: Card): boolean {
    if (card.color === 'black') return true;
    if (card.color === this.state.currentColor) return true;
    if (card.type === this.state.currentType) {
        if (card.type === 'number') return card.value === this.state.currentValue;
        return true;
    }
    return false;
  }

  advanceTurn(skip: boolean) {
     let currentIndex = this.playerIndexes.indexOf(this.state.currentTurnPlayerId);
     let nextIndex = currentIndex + (this.state.direction);
     
     if (skip) nextIndex += this.state.direction;

     if (nextIndex >= this.playerIndexes.length) nextIndex = nextIndex % this.playerIndexes.length;
     if (nextIndex < 0) nextIndex = this.playerIndexes.length + (nextIndex % this.playerIndexes.length);

     const nextPlayerId = this.playerIndexes[nextIndex];
     const nextPlayer = this.state.players.get(nextPlayerId);

     this.state.currentTurnPlayerId = nextPlayerId;

     if (this.state.drawStack > 0 && nextPlayer) {
         const incomingIsDraw2 = (this.state.currentType === 'draw2');
         const hasCounter = nextPlayer.hand.some(c => c.type === 'draw2');

         if (incomingIsDraw2 && hasCounter) {
             this.broadcast("notification", `${nextPlayer.name} can stack!`);
         } else {
             this.clock.setTimeout(() => {
                this.handleAutoDrawPenalty(nextPlayer);
             }, 1000);
         }
     }
  }

  handleAutoDrawPenalty(player: Player) {
      if (this.state.drawStack > 0) {
          const count = this.state.drawStack;
          for(let i=0; i<count; i++) this.moveCardFromDrawToHand(player);
          this.broadcast("notification", `${player.name} forced to draw ${count}!`);
          this.state.drawStack = 0;
          player.hasSaidUno = false;
          this.advanceTurn(false);
      }
  }

  updateCurrentState(card: Card) {
     this.state.currentColor = card.color;
     this.state.currentType = card.type;
     this.state.currentValue = card.value;
  }

  moveCardFromDrawToHand(player: Player): Card | null {
     if (this.state.drawPile.length === 0) {
        if (this.state.discardPile.length <= 1) return null;
        const top = this.state.discardPile.pop();
        const rest = [...this.state.discardPile];
        this.state.discardPile.clear();
        if(top) this.state.discardPile.push(top);
        
        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        rest.forEach(c => {
             if(c.type === 'wild' || c.type === 'wild4') c.color = 'black';
             this.state.drawPile.push(c);
        });
     }

     const card = this.state.drawPile.pop();
     if (card) {
        player.hand.push(card);
        player.cardsRemaining++;
        return card;
     }
     return null;
  }

  createDeck() {
     this.state.drawPile.clear();
     const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
     colors.forEach(color => {
        this.addCard(color, 'number', 0);
        for(let i=1; i<=9; i++) {
           this.addCard(color, 'number', i);
           this.addCard(color, 'number', i);
        }
        ['skip', 'reverse', 'draw2'].forEach(type => {
            this.addCard(color, type as CardType);
            this.addCard(color, type as CardType);
        });
     });
     for(let i=0; i<4; i++) {
        this.addCard('black', 'wild');
        this.addCard('black', 'wild4');
     }
  }

  addCard(color: CardColor, type: CardType, value: number = -1) {
     const card = new Card();
     card.id = Math.random().toString(36).substr(2, 9);
     card.color = color;
     card.type = type;
     card.value = value;
     this.state.drawPile.push(card);
  }

  shuffleDeck() {
      const cards = Array.from(this.state.drawPile);
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      this.state.drawPile.clear();
      cards.forEach(c => this.state.drawPile.push(c));
  }

  generateRoomCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  }
}