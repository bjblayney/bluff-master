import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Send, 
  Hash, 
  LogOut, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { auth, signInAnon } from './lib/firebase';
import { GameService, Game, Bluff, Player } from './lib/gameService';
import { onSnapshot, doc, collection, query } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [nameInput, setNameInput] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [bluffs, setBluffs] = useState<Bluff[]>([]);
  const [gameIdInput, setGameIdInput] = useState('');
  const [myBluff, setMyBluff] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);

  const [shuffledBluffs, setShuffledBluffs] = useState<Bluff[]>([]);

  useEffect(() => {
    if (game?.id) {
      const unsubGame = onSnapshot(doc(db, 'games', game.id), (doc) => {
        if (doc.exists()) {
          setGame({ id: doc.id, ...doc.data() } as Game);
        }
      });

      return () => unsubGame();
    }
  }, [game?.id]);

  useEffect(() => {
    if (game?.id && game?.status && game.status !== 'writing') {
      const unsubBluffs = onSnapshot(collection(db, 'games', game.id, 'bluffs'), (snap) => {
        const b = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bluff));
        setBluffs(b);
      });
      return () => unsubBluffs();
    }
  }, [game?.id, game?.status]);

  useEffect(() => {
    if (game?.status === 'voting' && shuffledBluffs.length === 0) {
      setShuffledBluffs([...bluffs].sort(() => Math.random() - 0.5));
    } else if (game?.status !== 'voting' && shuffledBluffs.length > 0) {
      setShuffledBluffs([]);
    }
  }, [game?.status, bluffs.length]);

  const handleLogin = async () => {
    if (!nameInput.trim()) return;
    setLoading(true);
    try {
      const u = await signInAnon(nameInput.trim());
      setUser(u);
    } catch (e) {
      setMessage('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const id = await GameService.createGame(user.uid, user.displayName || 'Anonymous');
      setGame({ id, hostId: user.uid, players: [], status: 'lobby', round: 1, usedWordIds: [] } as Game);
    } catch (e) {
      setMessage('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!user || !gameIdInput) return;
    setLoading(true);
    try {
      await GameService.joinGame(gameIdInput.toUpperCase(), {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        score: 0
      });
      setGame({ id: gameIdInput.toUpperCase(), hostId: '', players: [], status: 'lobby', round: 1, usedWordIds: [] } as Game);
    } catch (e) {
      setMessage('Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRound = async () => {
    if (!game) return;
    setLoading(true);
    try {
      await GameService.resetBluffs(game.id);
      const { word, definition } = await GameService.getRandomWord(game.id);
      await GameService.startGame(game.id, word, definition);
      setMyBluff('');
      setHasSubmitted(false);
      setHasVoted(false);
      setBluffs([]);
    } catch (e) {
      console.error('Error starting round:', e);
      setMessage('Error starting round');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBluff = async () => {
    if (!game || !myBluff) return;
    await GameService.submitBluff(game.id, user!.uid, user!.displayName || 'Anonymous', myBluff);
    setHasSubmitted(true);
  };

  const handleVote = async (bluffId: string) => {
    if (!game || hasVoted) return;
    await GameService.vote(game.id, user!.uid, bluffId);
    setHasVoted(true);
  };

  const handleNextPhase = async () => {
    if (!game) return;
    const nextStatuses: Record<string, any> = {
      'writing': 'voting',
      'voting': 'results',
      'results': 'lobby'
    };
    await GameService.setStatus(game.id, nextStatuses[game.status]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-natural-bg flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass rounded-[32px] p-10 border-b-4 border-stone-200"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-natural-emerald-dark rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-natural-emerald-dark/20">B</div>
            <h1 className="text-4xl font-bold text-natural-text mb-2 tracking-tight serif">Bluff Master</h1>
            <p className="text-stone-500 font-medium italic">The ultimate word deception game</p>
          </div>
          
          <div className="bg-stone-800/5 rounded-2xl p-6 mb-8 text-center italic text-stone-600">
            <p className="text-sm leading-relaxed">
              "Create a custom game room, invite your friends, and see who's the best at crafting believable lies for obscure words."
            </p>
          </div>

          <input
            type="text"
            placeholder="Enter your name to play"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            maxLength={30}
            className="w-full bg-stone-100 rounded-2xl px-4 py-3 mb-4 text-center font-medium outline-none focus:ring-2 focus:ring-stone-300"
          />
          <button 
            onClick={handleLogin}
            disabled={!nameInput.trim() || loading}
            className="w-full bg-stone-800 text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors shadow-lg shadow-stone-800/10 disabled:opacity-40"
            id="login-button"
          >
            {loading ? 'Joining...' : 'Enter the Room'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans p-4 md:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center glass px-8 py-4 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-natural-emerald-dark rounded-xl flex items-center justify-center text-white font-bold text-lg">B</div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Bluff Night <span className="text-stone-400 font-normal">/</span> {game ? `Room ${game.id}` : 'Lobby'}</h1>
            {game && <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono font-bold">Code: {game.id}</p>}
          </div>
        </div>
        <div className="flex items-center gap-6">
          {game && (
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Phase</p>
                <p className="font-bold text-sm capitalize">{game.status}</p>
              </div>
              <div className="h-8 w-px bg-stone-200"></div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Players</p>
                <p className="font-bold text-sm">{game.players.length}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold">{user.displayName}</span>
              <span className="text-[10px] uppercase tracking-widest text-[#A9B665] font-bold">Online</span>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="bg-stone-100 p-2 rounded-xl hover:bg-stone-200 text-stone-600 transition-colors"
              id="logout-button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {game && (
          <aside className="w-full md:w-64 glass rounded-3xl p-6 flex flex-col gap-4 overflow-y-auto max-h-[300px] md:max-h-full">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Participants ({game.players.length})</h2>
            <div className="space-y-3">
              {game.players.map((p) => (
                <div key={p.uid} className={`flex items-center justify-between p-3 rounded-2xl border ${p.uid === user.uid ? 'bg-white/60 border-stone-200' : 'border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold ring-2 ring-white">
                      {p.uid === game.hostId ? '👑' : p.name.charAt(0)}
                    </div>
                    <span className={`text-sm ${p.uid === user.uid ? 'font-bold' : 'font-medium'}`}>{p.name} {p.uid === user.uid && '(You)'}</span>
                  </div>
                  {bluffs.some(b => b.userId === p.uid && !b.isReal) && (
                    <div className="w-2 h-2 rounded-full bg-natural-emerald"></div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-auto bg-stone-800/5 p-4 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Leaderboard</p>
              <div className="space-y-2">
                {[...game.players].sort((a,b) => b.score - a.score).map((p) => (
                  <div key={p.uid} className="flex justify-between text-xs">
                    <span className="text-stone-600 truncate mr-2">{p.name}</span>
                    <span className="font-bold">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!game ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid sm:grid-cols-2 gap-8 h-full"
            >
              <div className="glass p-8 rounded-[32px] flex flex-col items-center text-center justify-center border-b-4 border-stone-200">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-500 mb-6">
                  <Play className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 serif">Host a Session</h3>
                <p className="text-stone-500 mb-8 text-sm leading-relaxed">Start a new private game room and challenge your teammates.</p>
                <button 
                  onClick={handleCreateGame}
                  disabled={loading}
                  className="w-full bg-natural-emerald-dark text-white rounded-2xl py-4 font-bold hover:bg-emerald-800 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/10"
                  id="create-game-button"
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </div>

              <div className="glass p-8 rounded-[32px] flex flex-col items-center text-center justify-center border-b-4 border-stone-200">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-500 mb-6">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 serif">Join Session</h3>
                <p className="text-stone-500 mb-6 text-sm leading-relaxed">If you have an invite code, enter it below to jump in.</p>
                <input 
                  type="text"
                  placeholder="CODE-123"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  className="w-full bg-white/50 border-2 border-stone-200 rounded-2xl p-4 mb-4 font-mono font-bold text-center text-2xl uppercase tracking-widest focus:ring-4 focus:ring-natural-emerald/10 outline-none"
                  id="game-id-input"
                />
                <button 
                  onClick={handleJoinGame}
                  disabled={loading || !gameIdInput}
                  className="w-full bg-stone-800 text-white rounded-2xl py-4 font-bold hover:bg-stone-700 transition-all disabled:opacity-50"
                  id="join-game-button"
                >
                  Join Room
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="game-room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col gap-6"
            >
              {/* Game Content */}
              <div className="flex-1 glass rounded-[32px] p-8 md:p-12 border-b-4 border-stone-200 flex flex-col">
                {game.status === 'lobby' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-[0.3em] mb-4">Preparation Phase</span>
                    <h1 className="text-5xl font-bold mb-4 serif text-stone-800 underline decoration-stone-200 underline-offset-8">The Lobby</h1>
                    <p className="text-stone-500 italic max-w-sm mb-12">Waiting for the crew to assemble before we start the bluffing rituals.</p>
                    
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                      {game.players.map(p => (
                        <div key={p.uid} className="flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full text-xs font-bold text-stone-600 border border-stone-200">
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px]">
                             {p.uid === game.hostId ? '👑' : p.name.charAt(0)}
                          </div>
                          {p.name}
                        </div>
                      ))}
                    </div>

                    {game.hostId === user.uid && (
                      <button 
                        onClick={handleStartRound}
                        disabled={loading || game.players.length < 1}
                        className="bg-natural-emerald-dark text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-900/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        id="start-game-button"
                      >
                        Start Round
                      </button>
                    )}
                  </div>
                )}

                {game.status === 'writing' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-[0.3em] mb-4">Submission Phase</span>
                    <div className="mb-12">
                      <p className="text-sm text-stone-400 italic mb-2">What is the definition of...</p>
                      <h1 className="text-5xl md:text-7xl font-bold serif text-stone-800 lowercase underline decoration-stone-200 underline-offset-8 decoration-4">{game.word}</h1>
                    </div>

                    {hasSubmitted ? (
                      <div className="bg-stone-50 p-12 rounded-[40px] text-center border-2 border-dashed border-stone-200 w-full max-w-lg">
                        <div className="w-16 h-16 bg-natural-emerald-dark/10 text-natural-emerald-dark rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 serif">Submission Received</h2>
                        <p className="text-stone-500 text-sm">Your lie has been planted. Now we wait for the others.</p>
                      </div>
                    ) : (
                      <div className="w-full max-w-xl space-y-6">
                        <div className="relative">
                          <textarea 
                            placeholder="Craft your most believable fake definition..."
                            value={myBluff}
                            onChange={(e) => setMyBluff(e.target.value)}
                            className="w-full h-48 bg-stone-50/50 rounded-[32px] p-8 text-lg font-medium focus:ring-4 focus:ring-stone-200/50 border-2 border-stone-100 outline-none resize-none italic shadow-inner"
                            id="bluff-textarea"
                          />
                        </div>
                        <button 
                          onClick={handleSubmitBluff}
                          disabled={!myBluff}
                          className="w-full bg-stone-800 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-stone-900/20"
                          id="submit-bluff-button"
                        >
                          <Send className="w-5 h-5" /> Submit Bluff
                        </button>
                      </div>
                    )}

                    {game.hostId === user.uid && bluffs.length > 1 && (
                      <div className="mt-12 pt-8 border-t border-stone-100 w-full">
                         <button onClick={handleNextPhase} className="text-stone-400 font-bold hover:text-stone-600 transition-colors uppercase text-[10px] tracking-widest">
                           Force Close Writing Phase ({bluffs.length - 1} submissions)
                         </button>
                      </div>
                    )}
                  </div>
                )}

                {game.status === 'voting' && (
                  <div className="flex-1 flex flex-col gap-8">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-[0.3em] mb-4">Voting Phase</span>
                      <h2 className="text-5xl font-bold serif text-stone-800 lowercase underline decoration-stone-200 underline-offset-8 mb-4">{game.word}</h2>
                      <p className="text-stone-500 italic">One of these is the truth. The others are traps.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {(shuffledBluffs.length > 0 ? shuffledBluffs : bluffs).map((b, idx) => (
                        <button 
                          key={b.id}
                          disabled={hasVoted || b.userId === user.uid}
                          onClick={() => handleVote(b.id!)}
                          className={`
                            p-6 rounded-[24px] text-left border-2 transition-all relative flex flex-col gap-3 group h-full
                            ${hasVoted && b.votes.includes(user.uid) 
                              ? 'bg-natural-emerald-dark text-white border-natural-emerald-dark ring-4 ring-natural-emerald/10' 
                              : 'bg-stone-50/50 border-stone-100 hover:border-stone-400'}
                            ${b.userId === user.uid ? 'opacity-50 cursor-not-allowed grayscale bg-stone-100' : ''}
                          `}
                          id={`vote-button-${b.id}`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${hasVoted && b.votes.includes(user.uid) ? 'bg-white text-natural-emerald-dark' : 'bg-stone-800 text-white'}`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <p className="text-sm md:text-base font-medium italic leading-relaxed leading-relaxed">{b.text}</p>
                          {b.userId === user.uid && <span className="mt-auto text-[8px] font-bold opacity-70 uppercase tracking-widest">This is your lie</span>}
                          {hasVoted && b.votes.includes(user.uid) && <span className="mt-auto text-[10px] font-bold uppercase tracking-widest">You Voted</span>}
                        </button>
                      ))}
                    </div>

                    {game.hostId === user.uid && (
                      <div className="text-center mt-auto pt-8">
                        <button onClick={handleNextPhase} className="bg-stone-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg">
                          Reveal the Truth
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {game.status === 'results' && (
                  <div className="flex-1 flex flex-col gap-10">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-[0.3em] mb-4">Reveal Phase</span>
                      <h1 className="text-5xl font-bold serif text-stone-800 underline decoration-stone-200 underline-offset-8 mb-4">{game.word}</h1>
                      <div className="mt-6 flex flex-col items-center">
                         <span className="text-[10px] font-bold px-4 py-1 bg-natural-emerald text-white rounded-full uppercase tracking-widest mb-4">The Absolute Truth</span>
                         <p className="text-2xl font-bold serif italic text-natural-emerald-dark max-w-2xl">"{game.definition}"</p>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      {bluffs.sort((a,b) => (a.isReal ? -1 : 1)).map((b) => (
                        <div 
                          key={b.id} 
                          className={`p-6 rounded-[32px] border-2 flex flex-col gap-3 transition-all ${b.isReal ? 'bg-emerald-50/30 border-natural-emerald/30 shadow-lg shadow-emerald-900/5' : 'bg-white border-stone-100'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${b.isReal ? 'text-natural-emerald-dark' : 'text-stone-400'}`}>
                              {b.isReal ? 'Verified Truth' : `${b.userName}'s Creative Bluff`}
                            </span>
                            <div className="flex -space-x-2">
                              {b.votes.map((v, i) => (
                                <div key={v} className="w-8 h-8 rounded-full bg-stone-800 text-white flex items-center justify-center text-[10px] border-2 border-white font-bold ring-1 ring-stone-100" title={game.players.find(p => p.uid === v)?.name}>
                                  {game.players.find(p => p.uid === v)?.name.charAt(0)}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className={`text-lg font-medium italic ${b.isReal ? 'text-natural-emerald-dark' : 'text-stone-700'}`}>{b.text}</p>
                          {b.votes.length > 0 && <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{b.votes.length} explorers fooled</p>}
                        </div>
                      ))}
                    </div>

                    {game.hostId === user.uid && (
                      <div className="text-center mt-auto pt-10">
                         <button 
                          onClick={handleStartRound}
                          className="bg-stone-800 text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-stone-900/20 hover:scale-105 active:scale-95 transition-all font-sans"
                          id="next-round-button"
                        >
                          Prepare Next Round
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </main>

      <footer className="max-w-6xl mx-auto w-full text-center py-4">
        <p className="text-stone-400 text-[10px] uppercase tracking-[0.2em] font-medium">Brought to life with Natural Tones & Deception</p>
      </footer>

      {/* Message Notifications */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl z-50"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{message}</span>
            <button onClick={() => setMessage('')} className="ml-4 opacity-50 hover:opacity-100">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
