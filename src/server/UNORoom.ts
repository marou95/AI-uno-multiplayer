import { Room, Client } from "colyseus";
import { UNOState, Player, Card } from "./schema/UNOState";
import { CardColor, CardType, GameStatus } from "../shared/types";
import { v4 as uuidv4 } from 'uuid';

export class UNORoom extends Room<UNOState> {
  maxClients = 6;
  playerIndexes: string[] = []; // maintain turn order

  onCreate(options: any) {
    console.log("🏠 [UNORoom] onCreate called");
    
    // Set patch rate to 20fps (50ms) to ensure smooth updates
    this.setPatchRate(50);

    try {
      console.log("   Initializing State...");
      const newState = new UNOState();
      this.setState(newState);
      console.log("   State Initialized.");

      this.state.roomCode = this.generateRoomCode();
      console.log(`✅ Room Created! ID: ${this.roomId}, Code: ${this.state.roomCode}`);
      
      // Metadata for lobby listing (optional but good practice)
      this.setMetadata({
        code: this.state.roomCode,
        status: 'Lobby'
      });

      this.setupMessageHandlers();
    } catch (e) {
      console.error("❌ CRITICAL ERROR in onCreate:", e);
      this.disconnect();
    }
  }

  setupMessageHandlers() {
    this.onMessage("setInfo", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.name = data.name || "Guest";
        console.log(`📝 Player ${client.sessionId} renamed to ${player.name}`);
      }
    });

    this.onMessage("toggleReady", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = !player.isReady;
        console.log(`✅ Player ${player.name} is now ${player.isReady ? 'Ready' : 'Not Ready'}`);
      }
    });

    this.onMessage("startGame", (client: Client) => {
      if (this.state.status !== GameStatus.LOBBY) return;
      const readyCount = Array.from(this.state.players.values()).filter((p: Player) => p.isReady).length;
      console.log(`▶️ Start Game Requested. Ready: ${readyCount}/${this.state.players.size}`);
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
    console.log(`👤 [UNORoom] Client joining: ${client.sessionId}`);
    try {
      const player = new Player();
      player.id = client.sessionId;
      player.sessionId = client.sessionId;
      player.name = options.name || "Guest";
      
      this.state.players.set(client.sessionId, player);
      this.playerIndexes.push(client.sessionId);
      
      console.log(`✅ [UNORoom] Client ${client.sessionId} added to state. Total players: ${this.state.players.size}`);
    } catch (e) {
      console.error("❌ Error in onJoin:", e);
      client.leave(4000); // Close with error code if join fails
    }
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 Client left: ${client.sessionId}, Consented: ${consented}`);
    try {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isConnected = false;
        if (this.state.status === GameStatus.LOBBY) {
          this.state.players.delete(client.sessionId);
          this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
        } else {
          if (consented) throw new Error("Consented leave");
          await this.allowReconnection(client, 30);
          player.isConnected = true;
          console.log(`♻️ Client reconnected: ${client.sessionId}`);
        }
      }
    } catch (e) {
      // Cleanup if reconnection failed
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        this.playerIndexes = this.playerIndexes.filter(id => id !== client.sessionId);
        this.broadcast("notification", `${player.name} left the game.`);
        
        if (this.state.players.size < 2 && this.state.status === GameStatus.PLAYING) {
           this.state.status = GameStatus.LOBBY;
           this.broadcast("notification", "Game reset due to lack of players.");
           console.log("🔄 Game Reset to Lobby");
        }
      }
    }
  }

  startGame() {
    console.log("🃏 Starting Game...");
    this.state.status = GameStatus.PLAYING;
    
    // Update metadata
    this.setMetadata({
        code: this.state.roomCode,
        status: 'Playing'
    });

    this.createDeck();
    this.shuffleDeck();
    
    this.playerIndexes.forEach(sessionId => {
      const player = this.state.players.get(sessionId);
      if (player) {
        player.hand.clear(); // Ensure clear hand
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
    console.log(`🏁 Game Started. Turn: ${this.state.currentTurnPlayerId}`);
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
        console.log(`🏆 Winner: ${player.name}`);
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
     card.id = uuidv4();
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
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O to avoid confusion
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  }
}
