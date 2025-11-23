import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { CardColor, CardType, GameStatus } from "../../shared/types";

export class Card extends Schema {
  @type("string") id: string = "";
  @type("string") color: CardColor = "black";
  @type("string") type: CardType = "number";
  @type("number") value: number = -1;
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") sessionId: string = "";
  @type("string") name: string = "Guest";
  @type("boolean") isReady: boolean = false;
  @type("boolean") isConnected: boolean = true;
  @type("boolean") hasSaidUno: boolean = false;
  @type("number") cardsRemaining: number = 0; // For public view
  @type([Card]) hand = new ArraySchema<Card>(); // Private view (filtered on client)
}

export class UNOState extends Schema {
  @type("string") status: string = GameStatus.LOBBY;
  @type("string") roomCode: string = "";
  @type("string") currentTurnPlayerId: string = "";
  @type("string") winner: string | null = null;
  @type("number") direction: number = 1; // 1 or -1
  @type({ map: Player }) players = new MapSchema<Player>();
  
  @type([Card]) drawPile = new ArraySchema<Card>();
  @type([Card]) discardPile = new ArraySchema<Card>();
  
  @type("string") currentColor: string = ""; // Tracks active color (important for Wilds)
  @type("string") currentType: string = "";  // Tracks active type
  @type("number") currentValue: number = -1; // Tracks active value
  
  @type("number") drawStack: number = 0; // Cumulative draw amount (+2, +4)
}