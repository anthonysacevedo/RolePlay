import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(__dirname, 'storage.json');

  app.use(express.json());

  // Initialize storage if not exists
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ groups: [] }));
  }

  const getStorage = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const saveStorage = (data: any) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  // API Routes
  app.get('/api/groups', (req, res) => {
    const storage = getStorage();
    res.json(storage.groups);
  });

  app.post('/api/cards', (req, res) => {
    const { tema, situacion, rol, desarrollo, setLabel, backImage, id } = req.body;
    const storage = getStorage();
    
    let group = storage.groups.find((g: any) => g.name.toLowerCase() === tema.toLowerCase());
    
    if (!group) {
      group = { name: tema, cards: [], id: Date.now().toString() };
      storage.groups.push(group);
    }

    const newCard = {
      id: id || Date.now().toString(),
      situacion,
      rol,
      desarrollo,
      tema,
      setLabel,
      backImage,
      updatedAt: new Date().toISOString()
    };

    if (id) {
      const cardIndex = group.cards.findIndex((c: any) => c.id === id);
      if (cardIndex !== -1) {
        group.cards[cardIndex] = newCard;
      } else {
        group.cards.push(newCard);
      }
    } else {
      group.cards.push(newCard);
    }

    saveStorage(storage);
    res.json({ success: true, card: newCard, group });
  });

  app.delete('/api/groups/:groupId', (req, res) => {
    const { groupId } = req.params;
    const storage = getStorage();
    storage.groups = storage.groups.filter((g: any) => g.id !== groupId);
    saveStorage(storage);
    res.json({ success: true });
  });

  app.delete('/api/groups/:groupId/cards/:cardId', (req, res) => {
    const { groupId, cardId } = req.params;
    const storage = getStorage();
    const group = storage.groups.find((g: any) => g.id === groupId);
    if (group) {
      group.cards = group.cards.filter((c: any) => c.id !== cardId);
      // If group is empty, maybe keep it or delete it? User says delete group via trash icon. 
      // So we just remove the card here.
      saveStorage(storage);
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
