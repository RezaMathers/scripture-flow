import React, { useState, useEffect } from 'react';
import { useScriptureSystem } from './hooks/useScriptureSystem';
import { supabase } from './supabaseClient';
import ReviewCard from './components/ReviewCard';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Plus, BookOpen, BarChart2, ChevronLeft, Search, Flame, Trophy, 
  Cloud, CloudCheck, CloudOff, X, ExternalLink, Settings, 
  RotateCcw, Moon, Sun, ArrowUp, ArrowDown, Undo2
} from 'lucide-react';

const SUGGESTIONS = [
  "2 Peter 1:2-3", "2 Corinthians 9:8", "Mark 9:23", "Mark 11:23-24", 
  "Philippians 4:13", "Philippians 4:8", "Philippians 4:6-7", 
  "Ephesians 4:29", "3 John 1:2", "John 6:35"
];

const BIBLE_VERSIONS = [
  { id: 'nkjv', name: 'NKJV' }, { id: 'nlt', name: 'NLT' }, { id: 'nasb', name: 'NASB' },
  { id: 'esv', name: 'ESV' }, { id: 'niv', name: 'NIV' }, { id: 'amp', name: 'AMP' },
  { id: 'kjv', name: 'KJV' }, { id: 'ylt', name: 'YLT' }
];

export default function App() {
  const { system, setSystem, promoteVerse, isDuplicate, syncStatus, resetSystem, moveVerse, unmasterVerse } = useScriptureSystem();
  const [view, setView] = useState(system.onboarded ? 'home' : 'onboard');
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const totalVerses = system.daily.length + system.odd.length + system.even.length + 
                     Object.values(system.days).flat().length + 
                     Object.values(system.dates).flat().length + system.archive.length;

  const fetchVerse = async (ref, ver) => {
    if (isDuplicate(ref)) { alert("Already in your library!"); return null; }
    try {
      const response = await fetch(`/${ver}.json`);
      const bible = await response.json();
      const regex = /^([\d\s]*[a-zA-Z]+)\s+(\d+):(\d+)(?:-(\d+))?$/;
      const match = ref.match(regex);
      if (!match) return null;
      const [_, book, chap, start, end] = match;
      const chapterData = bible[book][chap];
      let text = "";
      if (end) {
        for (let i = parseInt(start); i <= parseInt(end); i++) {
          text += `[${i}] ${chapterData[i.toString()] || chapterData[i]} `;
        }
      } else { text = chapterData[start.toString()] || chapterData[start]; }
      return { id: Date.now() + Math.random(), reference: ref, text: text.trim(), version: ver.toUpperCase() };
    } catch (e) { return null; }
  };

  const startReview = () => {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isOdd = today.getDate() % 2 !== 0;
    const queue = [
      ...system.daily.map(v => ({ ...v, cat: 'Daily' })),
      ...(isOdd ? system.odd : system.even).map(v => ({ ...v, cat: isOdd ? 'Odd' : 'Even' })),
      ...(system.days[dayName] || []).map(v => ({ ...v, cat: dayName })),
      ...(system.dates[today.getDate()] || []).map(v => ({ ...v, cat: `Date ${today.getDate()}` }))
    ];
    if (queue.length === 0) return alert(`No verses scheduled for today! Try adding some to your Daily box.`);
    setReviewQueue(queue);
    setCurrentIndex(0);
    setView('review');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center font-sans transition-colors duration-300">
      <main className="w-full max-w-md pb-20">
        
        {view === 'onboard' && (
          <OnboardingFlow 
            onComplete={(final) => { setSystem({ ...system, ...final, onboarded: true }); setView('home'); }} 
            fetchVerse={fetchVerse}
          />
        )}

        {view === 'home' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight font-rounded">
                  {system.username.toUpperCase()}'S FLOW
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {syncStatus === 'saved' ? (
                    <div className="text-[10px] font-bold text-green-500 flex items-center gap-1"><CloudCheck size={12}/> CLOUD SYNCED</div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 animate-pulse"><Cloud size={12}/> SYNCING...</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800">
                  {theme === 'light' ? <Moon size={20} className="text-slate-600"/> : <Sun size={20} className="text-yellow-400"/>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Library</p>
                <p className="text-xl font-black dark:text-white">{totalVerses}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Streak</p>
                <div className="flex items-center justify-center gap-1 text-orange-500">
                  <Flame size={14} fill="currentColor"/>
                  <p className="text-xl font-black">{system.streak}d</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Mastered</p>
                <p className="text-xl font-black text-blue-500">{system.archive.length}</p>
              </div>
            </div>
            
            <button onClick={startReview} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-14 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-4 transition-all active:scale-95 group">
              <div className="bg-white/20 p-5 rounded-full group-hover:scale-110 transition">
                <BookOpen size={44} />
              </div>
              <p className="text-2xl font-black tracking-tight">Walk the Word</p>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('library')} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-2 hover:bg-slate-50 transition">
                <Settings className="text-slate-400" />
                <p className="text-xs font-bold uppercase dark:text-slate-300 tracking-widest">Manage</p>
              </button>
              <button onClick={() => setView('add')} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-2 hover:bg-slate-50 transition">
                <Plus className="text-blue-500" />
                <p className="text-xs font-bold uppercase dark:text-slate-300 tracking-widest">Add Verse</p>
              </button>
            </div>
          </div>
        )}

        {view === 'review' && (
          <div className="relative flex flex-col items-center">
            <button onClick={() => setView('home')} className="mb-8 self-start p-2 text-slate-400 font-bold flex items-center gap-1"><ChevronLeft/> Cancel Review</button>
            <AnimatePresence mode="wait">
              {reviewQueue[currentIndex] && (
                <ReviewCard 
                  key={reviewQueue[currentIndex].id}
                  verse={reviewQueue[currentIndex]}
                  onNext={(mastered) => {
                    if (mastered) promoteVerse(reviewQueue[currentIndex].id);
                    if (currentIndex + 1 < reviewQueue.length) {
                      setCurrentIndex(currentIndex + 1);
                    } else {
                      const today = new Date().toDateString();
                      let newStreak = system.streak;
                      if (system.lastReviewDate !== today) {
                        newStreak = (system.lastReviewDate === new Date(Date.now() - 86400000).toDateString()) ? newStreak + 1 : 1;
                      }
                      setSystem({ ...system, streak: newStreak, lastReviewDate: today });
                      setView('complete');
                    }
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {view === 'library' && (
          <LibraryView system={system} onClose={() => setView('home')} moveVerse={moveVerse} unmasterVerse={unmasterVerse} />
        )}

        {view === 'add' && (
          <AddScriptureView 
            system={system} 
            onClose={() => setView('home')} 
            onAdd={(v) => { setSystem({...system, daily: [...system.daily, v]}); setView('home'); }}
            fetchVerse={fetchVerse}
          />
        )}

        {view === 'complete' && (
           <div className="text-center py-20 space-y-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl p-10 border dark:border-slate-800">
              <div className="relative inline-block">
                <Trophy size={100} className="mx-auto text-yellow-500" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="absolute -top-2 -right-2 text-4xl">✨</motion.div>
              </div>
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Daily Walk Complete</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium italic">"Your word is a lamp to my feet and a light to my path."</p>
              <button onClick={() => setView('home')} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-lg">Return to Dashboard</button>
           </div>
        )}

      </main>

      <FAQDrawer resetSystem={resetSystem} />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function LibraryView({ system, onClose, moveVerse, unmasterVerse }) {
  const sections = [
    { title: 'Daily Box', data: system.daily, key: 'daily' },
    { title: 'Odd Box', data: system.odd, key: 'odd' },
    { title: 'Even Box', data: system.even, key: 'even' },
    { title: 'Mastered', data: system.archive, key: 'archive' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800">
        <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter ml-2">Library Manager</h2>
        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X/></button>
      </div>
      {sections.map(sec => (
        <div key={sec.key} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border dark:border-slate-800">
          <h3 className="text-[10px] font-black text-blue-500 uppercase mb-4 px-2 tracking-[0.2em]">{sec.title}</h3>
          <div className="space-y-3">
            {sec.data.length === 0 && <p className="text-xs text-slate-300 italic px-2">No verses assigned to this box.</p>}
            {sec.data.map((v, i) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700/50">
                <div className="flex-1">
                  <p className="text-sm font-black dark:text-white">{v.reference}</p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">{v.version}</p>
                </div>
                <div className="flex gap-2">
                  {sec.key === 'archive' ? (
                    <button onClick={() => unmasterVerse(v.id)} className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl" title="Return to Daily">
                      <Undo2 size={18}/>
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => moveVerse(sec.key, i, -1)} className="p-2 text-slate-400 hover:text-slate-600 transition disabled:opacity-20" disabled={i === 0}><ArrowUp size={16}/></button>
                      <button onClick={() => moveVerse(sec.key, i, 1)} className="p-2 text-slate-400 hover:text-slate-600 transition disabled:opacity-20" disabled={i === sec.data.length - 1}><ArrowDown size={16}/></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQDrawer({ resetSystem }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl font-black text-2xl z-[50] hover:scale-110 transition border-4 border-white dark:border-slate-900">?</button>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-end" onClick={() => setIsOpen(false)}>
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-950 h-full p-8 overflow-y-auto shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="font-black text-2xl dark:text-white tracking-tighter">GUIDE & SETTINGS</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X/></button>
            </div>
            
            <div className="space-y-8 text-sm">
               <a href="https://youtu.be/f1wgNZ_Krtc" target="_blank" className="flex items-center justify-center gap-3 p-5 bg-slate-900 text-white rounded-3xl font-black tracking-tight hover:bg-slate-800 transition">
                 <ExternalLink size={18}/> WATCH VIDEO GUIDE
               </a>
               
               <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-800/50">
                  <p className="font-black text-blue-600 uppercase text-[10px] tracking-widest mb-3">The Waterfall System</p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Verses automatically graduate from <b>Daily</b> to <b>Weekly</b> and finally to the <b>Monthly Vault</b> as you master them. This ensures you never forget a verse you've learned.</p>
               </div>

               <div className="pt-10 border-t dark:border-slate-800">
                  <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest mb-4">Danger Zone</p>
                  <button 
                    onClick={() => { if(confirm("This will wipe all verses and reset your streak. Are you sure?")) { resetSystem(); window.location.reload(); } }}
                    className="w-full flex items-center justify-center gap-2 p-5 text-red-500 font-black bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 transition"
                  >
                    <RotateCcw size={18}/> RESET INITIAL SCRIPTURES
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function OnboardingFlow({ onComplete, fetchVerse }) {
  const [step, setStep] = useState(0); 
  const [data, setData] = useState({ username: "", preferredVersion: "nkjv", verses: [], authCode: "" });
  const [search, setSearch] = useState("");
  const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const toggleVerse = async (ref) => {
    if (data.verses.find(v => v.reference === ref)) {
      setData({...data, verses: data.verses.filter(v => v.reference !== ref)});
    } else {
      if (data.verses.length >= 10) return;
      const v = await fetchVerse(ref, data.preferredVersion);
      if (v) setData({...data, verses: [...data.verses, v]});
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl min-h-[550px] flex flex-col justify-center text-center border dark:border-slate-800">
       {step === 0 && (
          <div className="space-y-6">
            <h1 className="text-4xl font-black text-blue-600 tracking-tighter italic">Scripture Flow</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Your word, forever stored.</p>
            <button onClick={() => setStep(1)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl mt-6 active:scale-95 transition">GET STARTED</button>
            <button onClick={() => setStep('restore')} className="w-full py-4 text-slate-400 font-black uppercase text-xs tracking-widest">I HAVE A CODE</button>
          </div>
       )}

       {step === 'restore' && (
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Restore Flow</h2>
          <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center text-2xl font-mono font-black tracking-[0.3em] outline-none" placeholder="A1B2C3" maxLength={6} onChange={e => setData({...data, authCode: e.target.value.toUpperCase()})} />
          <button onClick={async () => {
            const { data: cloudData, error } = await supabase.from('user_vault').select('data').eq('auth_code', data.authCode).single();
            if (error || !cloudData) alert("Code not found!");
            else { onComplete(cloudData.data); }
          }} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black">SYNC DATA</button>
          <button onClick={() => setStep(0)} className="text-slate-400 font-bold uppercase text-[10px]">Go Back</button>
        </div>
       )}

       {step === 1 && (
         <div className="space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">What's your name?</h2>
            <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center font-black text-xl outline-none dark:text-white" placeholder="Adam" onChange={e => setData({...data, username: e.target.value})} />
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black disabled:opacity-50" disabled={!data.username}>CONTINUE</button>
         </div>
       )}

       {step === 2 && (
         <div className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4">Preferred Version</h2>
            <div className="grid grid-cols-2 gap-3">
              {BIBLE_VERSIONS.map(v => (
                <button key={v.id} onClick={() => setData({...data, preferredVersion: v.id})} className={`p-5 rounded-2xl font-black border-2 transition ${data.preferredVersion === v.id ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                  {v.name}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black mt-4">NEXT</button>
         </div>
       )}

       {step === 3 && (
         <div className="text-left">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Pick 10 Seeds</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">Progress: {data.verses.length}/10</p>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-bold outline-none dark:text-white" placeholder="Search (e.g. John 3:16)" value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={() => toggleVerse(search)} className="bg-slate-900 text-white p-4 rounded-2xl"><Search size={20}/></button>
            </div>
            <div className="grid grid-cols-2 gap-2 h-44 overflow-y-auto mb-6 pr-1 custom-scrollbar">
              {SUGGESTIONS.map(ref => {
                const selected = data.verses.some(v => v.reference === ref);
                return (
                  <button key={ref} onClick={() => toggleVerse(ref)} className={`p-4 rounded-2xl text-[10px] font-black transition ${selected ? 'bg-green-500 text-white shadow-inner scale-95' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                    {ref}
                  </button>
                );
              })}
            </div>
            <button onClick={() => { if(data.verses.length < 5) return alert("Select at least 5 to start!"); setData({...data, authCode: genCode()}); setStep(4); }} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black">GENERATE ACCESS CODE</button>
         </div>
       )}

       {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-black text-2xl uppercase tracking-tighter">Your Secret Key</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-10 rounded-[2.5rem] border-2 border-dashed border-blue-200">
              <p className="text-4xl font-mono font-black text-blue-600 tracking-[0.2em]">{data.authCode}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase px-8">Save this code. You'll need it to log in on other devices.</p>
            <button onClick={() => {
              const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
              onComplete({
                username: data.username,
                preferredVersion: data.preferredVersion,
                authCode: data.authCode,
                daily: data.verses.slice(0, 3),
                odd: [data.verses[3]],
                even: [data.verses[4]],
                days: dayOrder.reduce((acc, d, i) => ({ ...acc, [d]: data.verses[i+5] ? [data.verses[i+5]] : [] }), {}),
                archive: []
              });
            }} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black shadow-lg">I've Saved It</button>
          </div>
       )}
    </div>
  );
}

function AddScriptureView({ system, onClose, onAdd, fetchVerse }) {
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border dark:border-slate-800">
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-black dark:text-white uppercase tracking-tighter text-xl">Add to Daily</h2>
        <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full"><X/></button>
      </div>
      <input 
        className="w-full p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl mb-6 font-black text-lg outline-none dark:text-white placeholder:text-slate-300" 
        placeholder="e.g. Philippians 4:8" 
        value={ref} 
        onChange={e => setRef(e.target.value)} 
      />
      <button 
        disabled={loading}
        onClick={async () => { 
          setLoading(true);
          const v = await fetchVerse(ref, system.preferredVersion); 
          if(v) onAdd(v); 
          setLoading(false);
        }} 
        className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black shadow-lg disabled:opacity-50"
      >
        {loading ? "SEARCHING..." : "SAVE VERSE"}
      </button>
    </div>
  );
}