import React, { useState, useEffect } from 'react';
import { useScriptureSystem } from './hooks/useScriptureSystem';
import { supabase } from './supabaseClient';
import ReviewCard from './components/ReviewCard';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Plus, BookOpen, ChevronLeft, Search, Flame, Trophy, 
  Cloud, CloudCheck, X, Settings, RotateCcw, LogOut, Play
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
  const { system, setSystem, isDuplicate, syncStatus } = useScriptureSystem();
  const [view, setView] = useState(system.onboarded ? 'home' : 'onboard');
  const [onboardStep, setOnboardStep] = useState(0); 
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Theme Logic: Follow OS preferences
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (e) => e.matches ? root.classList.add('dark') : root.classList.remove('dark');
    applyTheme(mediaQuery);
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, []);

  // 2. Calendar-Based Streak Logic
  useEffect(() => {
    if (system.lastReviewDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastDate = new Date(system.lastReviewDate);
      lastDate.setHours(0, 0, 0, 0);
      
      const diffTime = today - lastDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      // If more than 1 day has passed since the last completion, streak breaks
      if (diffDays > 1) {
        setSystem({ ...system, streak: 0 });
      }
    }
  }, []);

  // 3. Navigation Actions
  const handleLogout = () => {
    if (confirm("Log out? Your verses and streak are safe. Use your code to return.")) {
      setSystem({ ...system, onboarded: false });
      setOnboardStep(0); 
      setView('onboard');
      return true;
    }
    return false;
  };

  const handleReset = () => {
    if (confirm("DANGER: This will delete all verses and reset your streak to 0. Continue?")) {
      setSystem({
        ...system,
        daily: [], odd: [], even: [],
        days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
        dates: {}, archive: [],
        streak: 0, lastReviewDate: null
      });
      setOnboardStep(3); // Go straight to Seed Selection
      setView('onboard');
      return true;
    }
    return false;
  };

  // 4. Waterfall Promotion Logic
  const promoteVerse = (verseId, sourceBox) => {
    const updatedSystem = { ...system };
    let verseToMove = null;

    if (sourceBox === 'daily') verseToMove = updatedSystem.daily.find(v => v.id === verseId);
    else if (sourceBox === 'odd') verseToMove = updatedSystem.odd.find(v => v.id === verseId);
    else if (sourceBox === 'even') verseToMove = updatedSystem.even.find(v => v.id === verseId);
    else if (sourceBox.startsWith('day-')) {
      const day = sourceBox.split('-')[1];
      verseToMove = updatedSystem.days[day].find(v => v.id === verseId);
    } else if (sourceBox.startsWith('date-')) {
      const date = sourceBox.split('-')[1];
      verseToMove = updatedSystem.dates[date].find(v => v.id === verseId);
    }

    if (!verseToMove) return;

    if (sourceBox === 'daily') {
      if (updatedSystem.odd.length === 0) { updatedSystem.odd.push(verseToMove); updatedSystem.daily = []; }
      else if (updatedSystem.even.length === 0) { updatedSystem.even.push(verseToMove); updatedSystem.daily = []; }
    } 
    else if (sourceBox === 'odd' || sourceBox === 'even') {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const emptyDay = days.find(d => updatedSystem.days[d].length === 0);
      if (emptyDay) {
        updatedSystem.days[emptyDay].push(verseToMove);
        if (sourceBox === 'odd') updatedSystem.odd = []; else updatedSystem.even = [];
      }
    }
    else if (sourceBox.startsWith('day-')) {
      const todayDate = new Date().getDate();
      if (!updatedSystem.dates[todayDate]) updatedSystem.dates[todayDate] = [];
      verseToMove.monthlyViews = 0;
      updatedSystem.dates[todayDate].push(verseToMove);
      updatedSystem.days[sourceBox.split('-')[1]] = [];
    }
    else if (sourceBox.startsWith('date-')) {
      verseToMove.monthlyViews = (verseToMove.monthlyViews || 0) + 1;
      if (verseToMove.monthlyViews >= 3) {
        updatedSystem.archive.push(verseToMove);
        const date = sourceBox.split('-')[1];
        updatedSystem.dates[date] = updatedSystem.dates[date].filter(v => v.id !== verseId);
      }
    }
    setSystem(updatedSystem);
  };

  const fetchVerse = async (ref, ver) => {
    if (isDuplicate(ref)) { alert("Already in library!"); return null; }
    try {
      const response = await fetch(`/${ver}.json`);
      const bible = await response.json();
      const match = ref.match(/^([\d\s]*[a-zA-Z]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
      if (!match) return null;
      const [_, book, chap, start, end] = match;
      const chapterData = bible[book][chap];
      let text = end ? Array.from({length: end-start+1}, (_, i) => chapterData[parseInt(start)+i]).join(' ') : chapterData[start];
      return { id: Date.now() + Math.random(), reference: ref, text: text.trim(), version: ver.toUpperCase() };
    } catch (e) { return null; }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center">
      <main className="w-full max-w-md pb-20">
        
        {view === 'onboard' && (
          <OnboardingFlow 
            system={system}
            initialStep={onboardStep}
            onComplete={(f) => { setSystem({ ...system, ...f, onboarded: true }); setView('home'); }} 
            fetchVerse={fetchVerse} 
          />
        )}

        {view === 'home' && (
          <div className="space-y-6">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-6xl font-cookie text-blue-600 dark:text-blue-400 leading-none">Waterfall</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{system.username}'s Flow</p>
              </div>
              <div className="flex items-center gap-2 text-orange-500 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-sm border dark:border-slate-800">
                <Flame size={16} fill="currentColor"/>
                <span className="font-bold">{system.streak || 0}d</span>
              </div>
            </header>

            <button onClick={() => {
              const today = new Date();
              const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
              const isOdd = today.getDate() % 2 !== 0;
              const queue = [
                ...system.daily.map(v => ({ ...v, source: 'daily' })),
                ...(isOdd ? system.odd : system.even).map(v => ({ ...v, source: isOdd ? 'odd' : 'even' })),
                ...(system.days[dayName] || []).map(v => ({ ...v, source: `day-${dayName}` })),
                ...(system.dates[today.getDate()] || []).map(v => ({ ...v, source: `date-${today.getDate()}` }))
              ];
              if (queue.length === 0) return alert("No verses scheduled for today!");
              setReviewQueue(queue); setCurrentIndex(0); setView('review');
            }} className="w-full bg-blue-600 text-white py-14 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-4 active:scale-95 transition-all group">
              <BookOpen size={48} className="group-hover:scale-110 transition" />
              <p className="text-2xl font-bold">Walk the Word</p>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('library')} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-2 shadow-sm">
                <Settings className="text-slate-400" />
                <p className="text-xs font-bold uppercase tracking-widest dark:text-slate-300">Library</p>
              </button>
              <button onClick={() => setView('add')} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-2 shadow-sm">
                <Plus className="text-blue-500" />
                <p className="text-xs font-bold uppercase tracking-widest dark:text-slate-300">Add New</p>
              </button>
            </div>
          </div>
        )}

        {view === 'review' && (
          <div className="relative flex flex-col items-center">
            <button onClick={() => setView('home')} className="mb-8 self-start p-2 text-slate-400 font-bold flex items-center gap-1 uppercase text-[10px] tracking-widest"><ChevronLeft size={16}/> End Session</button>
            <AnimatePresence mode="wait">
              {reviewQueue[currentIndex] && (
                <div className="w-full font-offside">
                  <ReviewCard 
                    key={reviewQueue[currentIndex].id}
                    verse={reviewQueue[currentIndex]}
                    onNext={(mastered) => {
                      if (mastered) promoteVerse(reviewQueue[currentIndex].id, reviewQueue[currentIndex].source);
                      if (currentIndex + 1 < reviewQueue.length) setCurrentIndex(currentIndex + 1);
                      else {
                        const todayStr = new Date().toDateString();
                        const isNewDay = system.lastReviewDate !== todayStr;
                        setSystem({ 
                          ...system, 
                          lastReviewDate: todayStr, 
                          streak: isNewDay ? (system.streak || 0) + 1 : system.streak 
                        });
                        setView('complete');
                      }
                    }}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {view === 'library' && <LibraryView system={system} onClose={() => setView('home')} />}
        {view === 'add' && <AddScriptureView system={system} onClose={() => setView('home')} onAdd={(v) => { setSystem({...system, daily: [...system.daily, v]}); setView('home'); }} fetchVerse={fetchVerse} />}
        {view === 'complete' && (
          <div className="text-center py-20 space-y-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl p-10 border dark:border-slate-800">
            <Trophy size={80} className="mx-auto text-yellow-500" />
            <h2 className="text-3xl font-bold dark:text-white">Walk Complete</h2>
            <button onClick={() => setView('home')} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-bold">Return to Dashboard</button>
          </div>
        )}
      </main>
      <FAQDrawer onReset={handleReset} onLogout={handleLogout} />
    </div>
  );
}

// --- ONBOARDING FLOW ---

function OnboardingFlow({ system, initialStep, onComplete, fetchVerse }) {
  const [step, setStep] = useState(initialStep);
  const [data, setData] = useState({ username: system.username || "", preferredVersion: system.preferredVersion || "nkjv", verses: [], authCode: system.authCode || "" });
  const [search, setSearch] = useState("");

  useEffect(() => { setStep(initialStep); }, [initialStep]);

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl min-h-[550px] flex flex-col justify-center text-center border dark:border-slate-800">
      {step === 0 && (
        <div className="space-y-6">
          <h1 className="text-6xl font-cookie text-blue-600">Waterfall</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Hidden Treasures</p>
          <button onClick={() => setStep(1)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-bold text-lg shadow-xl mt-6">I'm New</button>
          <button onClick={() => setStep('restore')} className="w-full py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">I Have a Code</button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">What's Your Name?</h2>
          <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center font-bold text-xl outline-none" placeholder="Name" value={data.username} onChange={e => setData({...data, username: e.target.value})} />
          <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-bold" disabled={!data.username}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight mb-4">Bible Version</h2>
          <div className="grid grid-cols-2 gap-3">
            {BIBLE_VERSIONS.map(v => (
              <button key={v.id} onClick={() => setData({...data, preferredVersion: v.id})} className={`p-5 rounded-2xl font-bold border-2 ${data.preferredVersion === v.id ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>{v.name}</button>
            ))}
          </div>
          <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-bold mt-4">Next Step</button>
        </div>
      )}

      {step === 3 && (
        <div className="text-left">
          <h2 className="text-xl font-bold tracking-tighter mb-1">Pick 10 Seeds</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">Seeds Selected: {data.verses.length}/10</p>
          <div className="flex gap-2 mb-4">
            <input className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-bold outline-none" placeholder="Search (John 3:16)" value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={async () => { const v = await fetchVerse(search, data.preferredVersion); if(v) setData({...data, verses: [...data.verses, v]}); }} className="bg-slate-900 text-white p-4 rounded-2xl"><Search/></button>
          </div>
          <div className="grid grid-cols-2 gap-2 h-44 overflow-y-auto mb-6 pr-1">
            {SUGGESTIONS.map(ref => {
              const selected = data.verses.some(v => v.reference === ref);
              return (
                <button key={ref} onClick={async () => {
                  if (selected) setData({...data, verses: data.verses.filter(v => v.reference !== ref)});
                  else { const v = await fetchVerse(ref, data.preferredVersion); if(v) setData({...data, verses: [...data.verses, v]}); }
                }} className={`p-4 rounded-2xl text-[10px] font-bold transition ${selected ? 'bg-green-500 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>{ref}</button>
              );
            })}
          </div>
          <button onClick={() => {
            if (data.verses.length < 5) return alert("Pick at least 5 seeds.");
            const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            onComplete({
              username: data.username, preferredVersion: data.preferredVersion, authCode: data.authCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
              daily: data.verses.slice(0, 1), odd: [data.verses[1]], even: [data.verses[2]],
              days: dayOrder.reduce((acc, d, i) => ({ ...acc, [d]: data.verses[i+3] ? [data.verses[i+3]] : [] }), {}), archive: []
            });
          }} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold">Start Memorizing</button>
        </div>
      )}

      {step === 'restore' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Restore Your Flow</h2>
          <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center text-2xl font-bold tracking-[0.3em] outline-none" placeholder="CODE" maxLength={6} onChange={e => setData({...data, authCode: e.target.value.toUpperCase()})} />
          <button onClick={async () => {
            const { data: cloudData, error } = await supabase.from('user_vault').select('data').eq('auth_code', data.authCode).single();
            if (error || !cloudData) alert("Code not found."); else onComplete(cloudData.data);
          }} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-bold">Sync Data</button>
          <button onClick={() => setStep(0)} className="text-slate-400 font-bold uppercase text-[10px]">Back</button>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function LibraryView({ system, onClose }) {
  const sections = [
    { title: 'Daily Box', data: system.daily, key: 'daily' },
    { title: 'Odd Box', data: system.odd, key: 'odd' },
    { title: 'Even Box', data: system.even, key: 'even' },
    { title: 'Weekly Slots', data: Object.values(system.days).flat(), key: 'weekly' },
    { title: 'Monthly Date Box', data: Object.values(system.dates).flat(), key: 'monthly' },
    { title: 'Mastered Archive', data: system.archive, key: 'archive' }
  ];
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold dark:text-white ml-2">Library Manager</h2>
        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X/></button>
      </div>
      {sections.map(sec => (
        <div key={sec.key} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border dark:border-slate-800 shadow-sm">
          <h3 className="text-[10px] font-bold text-blue-500 uppercase mb-4 px-2 tracking-widest">{sec.title}</h3>
          <div className="space-y-3">
            {sec.data.length === 0 && <p className="text-xs text-slate-300 italic px-2">Empty</p>}
            {sec.data.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div>
                  <p className="text-sm font-bold dark:text-white">{v.reference}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{v.version} {v.monthlyViews !== undefined ? `• ${v.monthlyViews}/3 Views` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddScriptureView({ system, onClose, onAdd, fetchVerse }) {
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border dark:border-slate-800">
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-bold dark:text-white text-xl tracking-tighter">Add to Daily Box</h2>
        <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full"><X/></button>
      </div>
      <input className="w-full p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl mb-6 font-bold text-lg outline-none" placeholder="e.g. Philippians 4:8" value={ref} onChange={e => setRef(e.target.value)} />
      <button disabled={loading} onClick={async () => { setLoading(true); const v = await fetchVerse(ref, system.preferredVersion); if(v) onAdd(v); setLoading(false); }} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-bold shadow-lg">
        {loading ? "Searching..." : "Save Verse"}
      </button>
    </div>
  );
}

function FAQDrawer({ onReset, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl font-bold text-2xl z-[50] border-4 border-white dark:border-slate-900 hover:scale-110 transition">?</button>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-end" onClick={() => setIsOpen(false)}>
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} className="w-full max-w-sm bg-white dark:bg-slate-950 h-full p-8 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="font-bold text-2xl dark:text-white tracking-tight">System Guide</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X/></button>
            </div>
            
            <div className="space-y-10 text-sm text-slate-600 dark:text-slate-400">
               {/* Video Section */}
               <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700">
                 <Play size={40} className="text-slate-400" />
                 <p className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Video Guide Placeholder</p>
               </div>

               {/* Step by Step Overview */}
               <div className="space-y-6">
                 <h3 className="text-blue-600 font-bold text-lg">The Waterfall (Charlotte Mason) System</h3>
                 <p className="leading-relaxed">Waterfall utilizes <strong>Spaced Repetition</strong> to transition scripture from short-term memory into your "Heart Vault" permanently.</p>
                 
                 <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 shrink-0">1</div>
                      <p><strong>Daily:</strong> New verses start here. You review them every single day until you can recite them perfectly.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 shrink-0">2</div>
                      <p><strong>Odd/Even:</strong> Once a verse is "Mastered" in Daily, it flows into the Odd or Even boxes. You only see these every other day.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 shrink-0">3</div>
                      <p><strong>Weekly:</strong> After mastering the Odd/Even boxes, the verse moves to a specific day of the week (e.g., Monday). You review it once every 7 days.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 shrink-0">4</div>
                      <p><strong>Monthly:</strong> Finally, the verse flows into a Date box (e.g., the 15th). You review it once a month. If mastered 3 times here, it is officially <strong>Archived</strong>.</p>
                    </div>
                 </div>
               </div>

               <div className="pt-10 border-t dark:border-slate-800 space-y-4">
                  <button onClick={() => { if(onLogout()) setIsOpen(false); }} className="w-full flex items-center justify-center gap-2 p-5 text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-sm">
                    <LogOut size={18}/> Log out and return to intro
                  </button>
                  <button onClick={() => { if(onReset()) setIsOpen(false); }} className="w-full p-5 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-2xl shadow-sm">
                    <RotateCcw size={18} className="inline mr-2"/> Reset Verses and Streaks
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
