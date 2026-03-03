import React, { useState } from 'react';
import { useScriptureSystem } from './hooks/useScriptureSystem';
import { supabase } from './supabaseClient';
import ReviewCard from './components/ReviewCard';
import FAQDrawer from './FAQDrawer';
import { AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, BarChart2, ChevronLeft, Search, Flame, Trophy, Cloud, CloudCheck, CloudOff } from 'lucide-react';

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
  const { system, setSystem, promoteVerse, isDuplicate, syncStatus } = useScriptureSystem();
  const [view, setView] = useState(system.onboarded ? 'home' : 'onboard');
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);

  const fetchVerse = async (ref, ver) => {
    if (isDuplicate(ref)) { alert("Already in your system!"); return null; }
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
      ...system.daily.map(v => ({ ...v, cat: 'Daily', src: 'daily' })),
      ...(isOdd ? system.odd : system.even).map(v => ({ ...v, cat: isOdd ? 'Odd' : 'Even', src: isOdd ? 'odd' : 'even' })),
      ...(system.days[dayName] || []).map(v => ({ ...v, cat: dayName, src: 'days' })),
      ...(system.dates[today.getDate()] || []).map(v => ({ ...v, cat: `Date ${today.getDate()}`, src: 'dates' }))
    ];

    if (queue.length === 0) return alert(`No verses scheduled for today, ${system.username}!`);
    setReviewQueue(queue);
    setCurrentIndex(0);
    setClickCount(0);
    setView('review');
  };

  const finalizeSession = () => {
    const todayString = new Date().toDateString();
    let newStreak = system.streak || 0;

    if (system.lastReviewDate !== todayString) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      newStreak = (system.lastReviewDate === yesterday.toDateString()) ? newStreak + 1 : 1;
    }

    setSystem({ ...system, streak: newStreak, lastReviewDate: todayString });
    setView('complete');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center font-sans">
      <main className="w-full max-w-md">
        {view === 'onboard' && (
          <OnboardingFlow 
            onComplete={(final) => { setSystem({ ...system, ...final, onboarded: true }); setView('home'); }} 
            fetchVerse={fetchVerse}
            setSystem={setSystem}
            setView={setView}
          />
        )}

        {view === 'home' && (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h1 className="text-xl font-black text-blue-600 uppercase italic tracking-tighter leading-none">{system.username}'S FLOW</h1>
                <div className="flex items-center gap-2 mt-1">
                  {syncStatus === 'syncing' && <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 animate-pulse"><Cloud size={10}/> SYNCING...</div>}
                  {syncStatus === 'saved' && <div className="flex items-center gap-1 text-[9px] font-bold text-green-500"><CloudCheck size={10}/> SAVED</div>}
                  {syncStatus === 'error' && <div className="flex items-center gap-1 text-[9px] font-bold text-red-500"><CloudOff size={10}/> OFFLINE</div>}
                </div>
              </div>
              {system.streak > 0 && (
                <div className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full text-orange-600 font-black text-[10px]">
                  <Flame size={12} fill="currentColor" /> {system.streak} DAY STREAK
                </div>
              )}
            </div>
            
            <button onClick={startReview} className="w-full bg-blue-600 text-white p-12 rounded-[2.5rem] shadow-xl flex flex-col items-center gap-4 transition active:scale-95">
              <BookOpen size={48} />
              <p className="text-2xl font-bold uppercase tracking-tight">Begin Review</p>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setView('stats')} className="bg-white p-6 rounded-[2.5rem] border cursor-pointer hover:bg-slate-50 transition">
                <BarChart2 className="text-blue-500 mb-2" />
                <p className="text-xs text-slate-400 font-bold uppercase">Mastered</p>
                <p className="text-2xl font-black">{system.archive.length}</p>
              </div>
              <div onClick={() => setView('add')} className="bg-white p-6 rounded-[2.5rem] border cursor-pointer flex flex-col items-center justify-center hover:bg-slate-50 transition">
                <Plus className="text-blue-500" />
                <p className="text-xs text-slate-400 font-bold uppercase">Add Verse</p>
              </div>
            </div>
          </div>
        )}

        {view === 'review' && (
          <div className="relative h-[550px] flex flex-col items-center">
            <AnimatePresence mode="wait">
              {reviewQueue[currentIndex] && (
                <ReviewCard 
                  key={reviewQueue[currentIndex].id}
                  verse={reviewQueue[currentIndex]}
                  category={reviewQueue[currentIndex].cat}
                  onNext={() => {
                    setClickCount(prev => prev + 1);
                    if (currentIndex + 1 < reviewQueue.length) setCurrentIndex(currentIndex + 1);
                    else finalizeSession();
                  }}
                />
              )}
            </AnimatePresence>
            {clickCount >= 3 && (
              <button 
                onClick={() => {
                  promoteVerse(reviewQueue[currentIndex].id);
                  setView('home');
                }}
                className="mt-8 bg-green-500 text-white w-full py-5 rounded-2xl font-black shadow-lg"
              >
                I HAVE MASTERED THIS
              </button>
            )}
          </div>
        )}

        {view === 'complete' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6">
            <Trophy size={60} className="mx-auto text-blue-500" />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Session Complete!</h2>
            <div className="flex justify-center gap-1">
              {Array.from({ length: Math.min(system.streak, 5) }).map((_, i) => (
                <span key={i} className="text-4xl">🔥</span>
              ))}
            </div>
            <p className="font-bold text-orange-600 uppercase tracking-widest">{system.streak} DAY STREAK</p>
            <p className="text-slate-400 italic text-sm">"Storing up treasures in your heart, {system.username}!"</p>
            <button onClick={() => setView('home')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">Back Home</button>
          </div>
        )}

        {view === 'add' && (
          <AddScriptureView 
            system={system} onClose={() => setView('home')} 
            onAdd={(v) => { setSystem({...system, daily: [...system.daily, v]}); setView('home'); }}
            fetchVerse={fetchVerse}
          />
        )}
      </main>
    </div>
  );
}

// OnboardingFlow and AddScriptureView remain identical to previous master version
function OnboardingFlow({ onComplete, fetchVerse, setSystem, setView }) {
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
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl min-h-[500px] flex flex-col justify-center">
      {step === 0 && (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter text-blue-600 italic">Scripture Flow</h2>
          <button onClick={() => setStep(1)} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-bold shadow-lg">I'M NEW</button>
          <button onClick={() => setStep('restore')} className="w-full bg-slate-100 text-slate-500 py-6 rounded-3xl font-bold">I HAVE A CODE</button>
        </div>
      )}
      {step === 'restore' && (
        <div className="text-center">
          <h2 className="text-xl font-black mb-4 uppercase">Restore Access</h2>
          <input className="w-full p-4 bg-slate-50 rounded-2xl mb-4 text-center text-2xl font-mono tracking-widest border-2 border-blue-100 outline-none" placeholder="A1B2C3" maxLength={6} onChange={e => setData({...data, authCode: e.target.value.toUpperCase()})} />
          <button onClick={async () => {
            const { data: cloudData, error } = await supabase.from('user_vault').select('data').eq('auth_code', data.authCode).single();
            if (error || !cloudData) alert("Code not found!");
            else { setSystem(cloudData.data); setView('home'); }
          }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">RESTORE DATA</button>
          <button onClick={() => setStep(0)} className="mt-6 text-slate-400 text-sm font-bold flex items-center justify-center gap-1"><ChevronLeft size={14}/> Back</button>
        </div>
      )}
      {step === 1 && (
        <div className="text-center">
          <h2 className="text-xl font-black mb-6 uppercase tracking-widest">Username</h2>
          <input className="w-full p-4 bg-slate-100 rounded-2xl mb-6 outline-none text-center font-bold" placeholder="e.g. Adam's Flow" onChange={e => setData({...data, username: e.target.value})} />
          <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50" disabled={!data.username}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div className="text-center">
          <h2 className="text-xl font-black mb-6 uppercase text-slate-400 text-xs tracking-widest">Bible Version</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {BIBLE_VERSIONS.map(v => (
              <button key={v.id} onClick={() => setData({...data, preferredVersion: v.id})} className={`p-4 rounded-xl font-bold border-2 ${data.preferredVersion === v.id ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                {v.name}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Next</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-black uppercase mb-1">Pick 10 Verses</h2>
          <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">Progress: {data.verses.length}/10</p>
          <div className="flex gap-2 mb-4">
            <input className="flex-1 p-3 bg-slate-100 rounded-xl text-sm outline-none" placeholder="Search (e.g. John 3:16)" value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={() => toggleVerse(search)} className="bg-slate-900 text-white p-3 rounded-xl"><Search size={18}/></button>
          </div>
          <div className="grid grid-cols-2 gap-2 h-40 overflow-y-auto mb-6 pr-1 custom-scrollbar">
            {SUGGESTIONS.map(ref => {
              const selected = data.verses.some(v => v.reference === ref);
              return (
                <button key={ref} onClick={() => toggleVerse(ref)} className={`p-3 rounded-xl text-[10px] font-bold transition ${selected ? 'bg-green-500 text-white shadow-inner scale-95' : 'bg-blue-50 text-blue-400'}`}>
                  {ref}
                </button>
              );
            })}
          </div>
          {data.verses.length === 10 && (
            <button onClick={() => { setData({...data, authCode: genCode()}); setStep(4); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold animate-pulse shadow-xl">Generate Access Code</button>
          )}
        </div>
      )}
      {step === 4 && (
        <div className="text-center space-y-6">
          <h2 className="text-xl font-black uppercase">Your Access Code</h2>
          <div className="bg-amber-50 p-8 rounded-3xl border-2 border-dashed border-amber-300">
            <p className="text-4xl font-mono font-black text-amber-600 tracking-widest">{data.authCode}</p>
          </div>
          <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase">Screenshot this now!<br/>Use it to restore your data on any device.</p>
          <button onClick={() => {
            const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            onComplete({
              username: data.username,
              preferredVersion: data.preferredVersion,
              authCode: data.authCode,
              daily: [data.verses[0]],
              odd: [data.verses[1]],
              even: [data.verses[2]],
              days: dayOrder.reduce((acc, d, i) => ({ ...acc, [d]: [data.verses[i+3]] }), {})
            });
          }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">I've Saved It</button>
        </div>
      )}
    </div>
  );
}

function AddScriptureView({ system, onClose, onAdd, fetchVerse }) {
  const [version, setVersion] = useState(system.preferredVersion);
  const [ref, setRef] = useState("");
  const [manual, setManual] = useState("");
  const isCustom = version === 'custom';
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold uppercase text-slate-400 text-xs tracking-widest">Add Verse</h2>
        <button onClick={onClose} className="p-2 bg-slate-50 rounded-full"><ChevronLeft size={20}/></button>
      </div>
      <select className="w-full p-4 bg-slate-100 rounded-2xl mb-4 font-bold outline-none" value={version} onChange={e => setVersion(e.target.value)}>
        {BIBLE_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        <option value="custom">Other (Manual)</option>
      </select>
      <input className="w-full p-4 bg-slate-100 rounded-2xl mb-4 outline-none font-bold" placeholder="Reference" value={ref} onChange={e => setRef(e.target.value)} />
      {isCustom && <textarea className="w-full p-4 bg-slate-100 rounded-2xl h-32 mb-4 outline-none italic" placeholder="Paste verse text..." onChange={e => setManual(e.target.value)}/>}
      <button onClick={async () => {
        if(isCustom) onAdd({ id: Date.now(), reference: ref, text: manual, version: 'CUSTOM' });
        else { const v = await fetchVerse(ref, version); if(v) onAdd(v); }
      }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">Save to Daily Box</button>
      <FAQDrawer />
    </div>
  );
}