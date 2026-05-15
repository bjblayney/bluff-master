import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  arrayUnion,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export type GameStatus = 'lobby' | 'writing' | 'voting' | 'results' | 'ended';

export interface Player {
  uid: string;
  name: string;
  score: number;
}

export interface Game {
  id: string;
  hostId: string;
  status: GameStatus;
  word?: string;
  definition?: string;
  round: number;
  players: Player[];
  usedWordIds: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Bluff {
  id?: string;
  gameId: string;
  userId: string;
  userName: string;
  text: string;
  votes: string[];
  isReal: boolean;
}

export const GameService = {
  async createGame(hostId: string, hostName: string): Promise<string> {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameData = {
      hostId,
      status: 'lobby',
      round: 1,
      players: [{ uid: hostId, name: hostName, score: 0 }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'games', gameId), gameData);
      return gameId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `games/${gameId}`);
      throw error;
    }
  },

  async joinGame(gameId: string, player: Player): Promise<void> {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        players: arrayUnion(player),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
    }
  },

  async startGame(gameId: string, word: string, definition: string): Promise<void> {
    try {
      // Add the real definition as a system bluff first
      await addDoc(collection(db, 'games', gameId, 'bluffs'), {
        gameId,
        userId: 'SYSTEM',
        userName: 'REAL_DEFINITION',
        text: definition,
        votes: [],
        isReal: true
      });

      await updateDoc(doc(db, 'games', gameId), {
        status: 'writing',
        word,
        definition,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
    }
  },

  async submitBluff(gameId: string, userId: string, userName: string, text: string): Promise<void> {
    try {
      const bluffData: Bluff = {
        gameId,
        userId,
        userName,
        text,
        votes: [],
        isReal: false
      };
      await setDoc(doc(db, 'games', gameId, 'bluffs', userId), bluffData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `games/${gameId}/bluffs/${userId}`);
    }
  },

  async vote(gameId: string, voterId: string, bluffId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'games', gameId, 'bluffs', bluffId), {
        votes: arrayUnion(voterId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}/bluffs/${bluffId}`);
    }
  },

  async setStatus(gameId: string, status: GameStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
    }
  },

  async resetBluffs(gameId: string): Promise<void> {
    try {
      const bluffsSnap = await getDocs(collection(db, 'games', gameId, 'bluffs'));
      const deletions = bluffsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletions);
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `games/${gameId}/bluffs`);
    }
  },

  async getRandomWord(gameId: string): Promise<{ word: string; definition: string }> {
    const gameSnap = await getDoc(doc(db, 'games', gameId));
    const usedWordIds: string[] = gameSnap.data()?.usedWordIds ?? [];

    const wordBankSnap = await getDocs(collection(db, 'wordBank'));
    if (wordBankSnap.empty) {
      throw new Error('Word bank is empty. Run the seed script to populate it.');
    }

    const allWords = wordBankSnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as { word: string; definition: string }),
    }));

    let pool = allWords.filter(w => !usedWordIds.includes(w.id));
    let cycled = false;

    if (pool.length === 0) {
      pool = allWords;
      cycled = true;
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];

    await updateDoc(doc(db, 'games', gameId), {
      usedWordIds: cycled ? [chosen.id] : arrayUnion(chosen.id),
      updatedAt: serverTimestamp(),
    });

    return { word: chosen.word, definition: chosen.definition };
  }
};
