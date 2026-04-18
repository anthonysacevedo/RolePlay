import axios from 'axios';

// Detect if we are running in a static environment (like GitHub Pages) 
// or if we should use the local Express server.
const isStatic = !!(import.meta as any).env?.PROD && 
                 !window.location.hostname.includes('run.app') && 
                 !window.location.hostname.includes('localhost');

interface Card {
  id: string;
  situacion: string;
  rol: string;
  desarrollo: string;
  tema: string;
  setLabel: string;
  backImage: string | null;
  updatedAt: string;
}

interface Group {
  id: string;
  name: string;
  cards: Card[];
}

const LOCAL_STORAGE_KEY = 'roleplay_cards_data';

const getLocalData = (): Group[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (groups: Group[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groups));
};

export const api = {
  getGroups: async (): Promise<Group[]> => {
    if (isStatic) {
      return getLocalData();
    }
    try {
      const res = await axios.get('/api/groups');
      return res.data;
    } catch (err) {
      console.warn('Backend not available, falling back to localStorage');
      return getLocalData();
    }
  },

  saveCard: async (cardData: any): Promise<{ success: boolean }> => {
    if (isStatic) {
      const groups = getLocalData();
      const { tema, id } = cardData;
      
      let group = groups.find((g) => g.name.toLowerCase() === tema.toLowerCase());
      if (!group) {
        group = { name: tema, cards: [], id: Date.now().toString() };
        groups.push(group);
      }

      const newCard = {
        ...cardData,
        id: id || Date.now().toString(),
        updatedAt: new Date().toISOString()
      };

      if (id) {
        const cardIndex = group.cards.findIndex((c) => c.id === id);
        if (cardIndex !== -1) {
          group.cards[cardIndex] = newCard;
        } else {
          group.cards.push(newCard);
        }
      } else {
        group.cards.push(newCard);
      }

      saveLocalData(groups);
      return { success: true };
    }

    const res = await axios.post('/api/cards', cardData);
    return res.data;
  },

  deleteGroup: async (groupId: string): Promise<{ success: boolean }> => {
    if (isStatic) {
      const groups = getLocalData().filter(g => g.id.toString() !== groupId.toString());
      saveLocalData(groups);
      return { success: true };
    }
    const res = await axios.delete(`/api/groups/${groupId}`);
    return res.data;
  },

  deleteCard: async (groupId: string, cardId: string): Promise<{ success: boolean }> => {
    if (isStatic) {
      const groups = getLocalData();
      const groupIndex = groups.findIndex(g => g.id.toString() === groupId.toString());
      if (groupIndex !== -1) {
        groups[groupIndex].cards = groups[groupIndex].cards.filter(c => c.id.toString() !== cardId.toString());
        if (groups[groupIndex].cards.length === 0) {
          groups.splice(groupIndex, 1);
        }
        saveLocalData(groups);
        return { success: true };
      }
      return { success: false };
    }
    const res = await axios.delete(`/api/groups/${groupId}/cards/${cardId}`);
    return res.data;
  }
};
