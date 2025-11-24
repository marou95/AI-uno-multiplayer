
import { Room, Client } from "colyseus";
import { ArraySchema } from "@colyseus/schema";
import { UNOState, Player, Card } from "./schema/UNOState";
import { CardColor, CardType, GameStatus } from "../shared/types";

// Helper to generate IDs without external dependencies
const generateId = () => Math.random().toString(36).substring(2, 9);

export class UNORoom extends Room<UNOState> {
  maxClients = 6;
  playerIndexes: string[] = []; 

  async onCreate(options: any) {
    console.log("🏠 [UNORoom] Creating new room...");
    
    // 1. Initialize State & Arrays explicitly
    this.setState(new UNOState());
    this.playerIndexes = []; 
    
    // 2. Generate and Set Room Code
    const roomCode = this.generateRoomCode();
    this.state.roomCode = roomCode;
    console.log(`✅ Room Created! ID: ${this.roomId} | Code: ${roomCode}`);

    // 3. Set Metadata for Matchmaking (Crucial for filterBy(['roomCode']))
    // We await this to ensure matchmaking is ready before we consider creation 'done'
    try {
      await this.setMetadata({
        roomCode: roomCode,
        status: 'Lobby'
      });
      console.log(`📦 Metadata set for room ${roomCode}`);
    } catch (err) {
      console.error("❌ Failed to set metadata:", err);
    }

    // 4. Setup Handlers
    this.setPatchRate(50); // 20fps
    this.setupMessageHandlers();
  }

  onJoin(client: Client, options: any) {
    try {
      console.log(`👤 [UNORoom] Client joining: ${client.sessionId}`);
      
      // Validations
      if (this.state.status !== GameStatus.LOBBY) {
         console.log(`⚠️ Client ${client.sessionId} attempting to join active game.`);
         // Optional: Allow reconnect logic here if needed
      }

      const name = options?.name || "Guest";

      const player = new Player();
      player.id = client.sessionId;
      player.sessionId = client.sessionId;
      player.name = name;
      player.hand = new ArraySchema<Card>(); // Ensure hand is initialized
      
      this.state.players.set(client.sessionId, player);
      
      // Defensive push
      if (!this.playerIndexes) this.playerIndexes = [];
      this.playerIndexes.push(client.sessionId);
      
      console.log(`✅ Client ${client.sessionId} (${name}) joined successfully.`);
    } catch (e) {
      console.error("❌ CRITICAL ERROR IN ONJOIN:", e);
      // Close connection with a specific application error code instead of crashing the server
      client.leave(4001); 
    }
  }

  setupMessageHandlers() {
    this.onMessage("setInfo", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.name = data.name || "Guest";
      }
    });

    this.onMessage("toggleReady", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = !player.isReady;
      }
    });

    this.onMessage("startGame", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      // Host is the first player in the indexes
      const isHost = this.playerIndexes[0] === client.sessionId;
      
      if (!isHost) return;

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

  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 Client left: ${client.sessionId}`);
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.isConnected = false;

    try {
      if (consented) {
          throw new Error("consented_leave");
      }
      // Allow reconnection for 20 seconds
      await this.allowReconnection(client, 20);
      player.isConnected = true;
      console.log(`♻️ Client reconnected: ${client.sessionId}`);

    } catch (e) {
      // Handle permanent leave
      if (this.state.players.has(client.sessionId)) {
        this.state.players.delete(client.sessionId);
      }
      
      if (this.playerIndexes) {
        this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
      }
      
      if (this.state.status !== GameStatus.LOBBY) {
         this.broadcast("notification", `${player.name} left the game.`);
         // If too few players, reset
         if (this.state.players.size < 2) {
             this.state.status = GameStatus.LOBBY;
             this.broadcast("notification", "Game reset (too few players).");
             this.setMetadata({ status: 'Lobby' }).catch(console.error);
             console.log("🔄 Game Reset to Lobby");
         }
      }
    }
  }

  startGame() {
    console.log("🃏 Starting Game...");
    this.state.status = GameStatus.PLAYING;
    this.setMetadata({ status: 'Playing' }).catch(console.error);

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

  handlePlayCard(client: Client, cardId: string, chooseColor?: CardColor) {
    if (this.state.currentTurnPlayerId !== client.sessionId) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const card = player.hand[cardIndex];

    const isValid = this.isValidMove(card);
    if (!isValid) {
      client.send("error", "Invalid move");
      return;
    }

    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);
    player.cardsRemaining = player.hand.length;
    
    if (player.hand.length === 1 && !player.hasSaidUno) {
        player.hasSaidUno = false;
    } else if (player.hand.length === 0) {
        this.state.winner = player.name;
        this.state.status = GameStatus.FINISHED;
        return;
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

    if (this.state.drawStack > 0) {
       for(let i=0; i<this.state.drawStack; i++) this.moveCardFromDrawToHand(player);
       this.state.drawStack = 0;
       this.advanceTurn(false);
       return;
    }

    const newCard = this.moveCardFromDrawToHand(player);
    
    if (newCard && !this.isValidMove(newCard)) {
       this.advanceTurn(false);
    } else {
       client.send("notification", "You drew a playable card!");
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

     // Modulo arithmetic for circular array
     if (nextIndex >= this.playerIndexes.length) nextIndex = nextIndex % this.playerIndexes.length;
     if (nextIndex < 0) nextIndex = this.playerIndexes.length + (nextIndex % this.playerIndexes.length);

     this.state.currentTurnPlayerId = this.playerIndexes[nextIndex];
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
        
        // Shuffle rest
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
     card.id = generateId();
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
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  }
}
