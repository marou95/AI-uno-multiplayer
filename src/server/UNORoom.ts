import { Room, Client } from "colyseus";
import { UNOState, Player, Card } from "./schema/UNOState";
import { CardColor, CardType, GameStatus } from "../shared/types";
import { v4 as uuidv4 } from 'uuid';

export class UNORoom extends Room<UNOState> {
  declare state: UNOState;
  maxClients = 6;
  playerIndexes: string[] = []; // maintain turn order

  onCreate(options: any) {
    this.setState(new UNOState());
    this.state.roomCode = this.generateRoomCode();
    
    this.onMessage("setInfo", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.name = data.name || "Guest";
      }
    });

    this.onMessage("toggleReady", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      const player = this.state.players.get(client.sessionId);
      if (player) player.isReady = !player.isReady;
    });

    this.onMessage("startGame", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      // Host check omitted for simplicity, allowing any player to start if conditions met
      const readyCount = Array.from(this.state.players.values()).filter((p: Player) => p.isReady).length;
      if (readyCount >= 2 && readyCount === this.state.players.size) {
        this.startGame();
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
      if (player && player.hand.length <= 2) {
         player.hasSaidUno = true;
         this.broadcast("notification", `${player.name} said UNO!`);
      }
    });
  }

  onJoin(client: Client, options: any) {
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
      if (this.state.status === GameStatus.LOBBY) {
        this.state.players.delete(client.sessionId);
        this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
      } else {
        // Game in progress - wait for reconnect
        try {
          if (consented) throw new Error("Consented leave");
          await this.allowReconnection(client, 30);
          player.isConnected = true;
        } catch (e) {
          this.state.players.delete(client.sessionId);
          this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
          this.broadcast("notification", `${player.name} left the game.`);
          if (this.state.players.size < 2) {
             this.state.status = GameStatus.LOBBY; // Reset if too few players
             this.broadcast("notification", "Game reset due to lack of players.");
          }
        }
      }
    }
  }

  startGame() {
    this.state.status = GameStatus.PLAYING;
    this.createDeck();
    this.shuffleDeck();
    
    // Deal 7 cards
    this.playerIndexes.forEach(sessionId => {
      const player = this.state.players.get(sessionId);
      if (player) {
        for (let i = 0; i < 7; i++) {
          this.moveCardFromDrawToHand(player);
        }
        player.cardsRemaining = 7;
        player.hasSaidUno = false;
      }
    });

    // Flip first card
    const firstCard = this.state.drawPile.pop();
    if (firstCard) {
      this.state.discardPile.push(firstCard);
      this.updateCurrentState(firstCard);
      // If first card is Wild, Color must be chosen? For simplicity, random valid color
      if (firstCard.color === 'black') {
        this.state.currentColor = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
      }
    }

    this.state.currentTurnPlayerId = this.playerIndexes[0];
  }

  handlePlayCard(client: Client, cardId: string, chooseColor?: CardColor) {
    if (this.state.currentTurnPlayerId !== client.sessionId) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const card = player.hand[cardIndex];

    // Validation
    const isValid = this.isValidMove(card);
    if (!isValid) {
      client.send("error", "Invalid move");
      return;
    }

    // Apply Move
    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);
    player.cardsRemaining = player.hand.length;
    
    // Check UNO rule
    if (player.hand.length === 1 && !player.hasSaidUno) {
        // In strict rules, penalty is applied if caught before next player.
        // Here, we auto-flag "needs UNO" or let them click button. 
        // For simplicity: reset flag.
        player.hasSaidUno = false;
    } else if (player.hand.length === 0) {
        this.state.winner = player.name;
        this.state.status = GameStatus.FINISHED;
        return;
    }

    // Handle Effects
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
      case 'skip':
        skipNext = true;
        break;
      case 'draw2':
        this.state.drawStack += 2;
        break;
      case 'wild4':
        this.state.drawStack += 4;
        break;
    }

    this.advanceTurn(skipNext);
  }

  handleDrawCard(client: Client) {
    if (this.state.currentTurnPlayerId !== client.sessionId) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // If there is a stack (from +2 or +4), player draws stack and loses turn
    if (this.state.drawStack > 0) {
       for(let i=0; i<this.state.drawStack; i++) this.moveCardFromDrawToHand(player);
       this.state.drawStack = 0;
       this.advanceTurn(false);
       return;
    }

    // Standard draw
    const newCard = this.moveCardFromDrawToHand(player);
    
    // If playable immediately, allow play (Optional rule, usually they can play if valid)
    // For this implementation, we force pass after draw to simplify interaction flow, 
    // OR we can let them play. Let's Auto-pass if not playable, stay if playable.
    if (newCard && !this.isValidMove(newCard)) {
       this.advanceTurn(false);
    } else {
       // Player can play this card now. They stay current turn.
       // Client side should highlight the new card.
       client.send("notification", "You drew a playable card!");
    }
  }

  isValidMove(card: Card): boolean {
    if (card.color === 'black') return true; // Wilds always playable
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

     // Wrap around
     if (nextIndex >= this.playerIndexes.length) nextIndex = nextIndex % this.playerIndexes.length;
     if (nextIndex < 0) nextIndex = this.playerIndexes.length + (nextIndex % this.playerIndexes.length); // handle negative modulo

     this.state.currentTurnPlayerId = this.playerIndexes[nextIndex];
  }

  updateCurrentState(card: Card) {
     this.state.currentColor = card.color;
     this.state.currentType = card.type;
     this.state.currentValue = card.value;
  }

  moveCardFromDrawToHand(player: Player): Card | null {
     if (this.state.drawPile.length === 0) {
        // Reshuffle discard (except top)
        if (this.state.discardPile.length <= 1) return null; // Safety
        const top = this.state.discardPile.pop();
        const rest = [...this.state.discardPile];
        this.state.discardPile.clear();
        if(top) this.state.discardPile.push(top);
        
        // Shuffle rest
        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        rest.forEach(c => {
             // Reset wild colors to black when reshuffling
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
        // 0
        this.addCard(color, 'number', 0);
        // 1-9 x2
        for(let i=1; i<=9; i++) {
           this.addCard(color, 'number', i);
           this.addCard(color, 'number', i);
        }
        // Action cards x2
        ['skip', 'reverse', 'draw2'].forEach(type => {
            this.addCard(color, type as CardType);
            this.addCard(color, type as CardType);
        });
     });

     // Wilds x4
     for(let i=0; i<4; i++) {
        this.addCard('black', 'wild');
        this.addCard('black', 'wild4');
     }
  }

  addCard(color: CardColor, type: CardType, value: number = -1) {
     const card = new Card();
     card.id = uuidv4();
     card.color = color;
     card.type = type;
     card.value = value;
     this.state.drawPile.push(card);
  }

  shuffleDeck() {
      // Fisher-Yates inside Schema Array is tricky, convert to JS array then rebuild
      const cards = Array.from(this.state.drawPile);
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      this.state.drawPile.clear();
      cards.forEach(c => this.state.drawPile.push(c));
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }
}