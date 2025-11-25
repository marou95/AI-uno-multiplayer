import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { GameStatus } from "../../shared/types";
import type { CardColor, CardType } from "../../shared/types";

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
  @type("number") cardsRemaining: number = 0;
  @type([Card]) hand: ArraySchema<Card> = new ArraySchema<Card>();
}

export class UNOState extends Schema {
  @type("string") status: string = GameStatus.LOBBY;
  @type("string") roomCode: string = "";
  @type("string") currentTurnPlayerId: string = "";
  @type("string") winner: string = "";
  @type("number") direction: number = 1;
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  
  @type([Card]) drawPile: ArraySchema<Card> = new ArraySchema<Card>();
  @type([Card]) discardPile: ArraySchema<Card> = new ArraySchema<Card>();
  
  @type("string") currentColor: string = "";
  @type("string") currentType: string = "";
  @type("number") currentValue: number = -1;
  @type("number") drawStack: number = 0;
}