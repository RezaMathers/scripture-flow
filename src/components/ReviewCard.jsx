import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Eye } from 'lucide-react';

export default function ReviewCard({ verse, onNext }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 shadow-2xl border dark:border-slate-800 flex flex-col items-center text-center min-h-[450px] justify-between cursor-pointer transition-colors"
      onClick={() => setRevealed(true)}
    >
      <div className="w-full">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Reviewing: {verse.cat}</p>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-10 leading-tight">
          {verse.reference}
        </h2>
        
        {revealed ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <p className="text-xl text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
              {verse.text}
            </p>
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest pt-4">
              {verse.version}
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-200 dark:text-slate-800 py-12">
            <Eye size={64} />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Tap to show verse</p>
          </div>
        )}
      </div>

      <div className="w-full pt-8">
        {revealed ? (
          <div className="flex gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onNext(false); }}
              className="flex-[1.5] bg-slate-100 dark:bg-slate-800 p-6 rounded-[2rem] font-black text-slate-500 text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition"
            >
              NEXT VERSE <ChevronRight size={16}/>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onNext(true); }}
              className="flex-1 bg-green-500 p-6 rounded-[2rem] font-black text-white text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition"
            >
              <Check size={18}/> MASTERED
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-4 animate-pulse">Say it out loud first</p>
        )}
      </div>
    </motion.div>
  );
}