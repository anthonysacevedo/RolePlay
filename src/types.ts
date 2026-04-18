export interface Card {
  id: string;
  situacion: string;
  rol: string;
  desarrollo: string;
  tema: string;
  setLabel: string;
  backImage: string | null;
  updatedAt: string;
}

export interface CardGroup {
  id: string;
  name: string;
  cards: Card[];
}
