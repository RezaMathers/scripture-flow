import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function ReviewCard({ verse, category, onNext }) {
  return (
    <motion.div 
      initial={{ x: 300, opacity: 0, rotateY: 45 }}
      animate={{ x: 0, opacity: 1, rotateY: 0 }}
      exit={{ x: -300, opacity: 0, rotateY: -45 }}
      transition={{ type: "spring", damping: 25 }}
      className="absolute bg-white rounded-[2.5rem] shadow-2xl p-8 w-full h-full flex flex-col justify-between border-r-[12px] border-blue-600 cursor-default"
    >
      <div className="flex-1">
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{category}</span>
        <h2 className="text-3xl font-serif font-bold text-slate-800 mt-2">{verse.reference}</h2>
        <div className="mt-8 overflow-y-auto h-[250px] pr-2">
          <p className="text-xl text-slate-600 italic leading-relaxed">"{verse.text}"</p>
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button 
          onClick={onNext}
          className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </motion.div>
  );
}