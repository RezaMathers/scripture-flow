import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const INITIAL_STATE = {
  username: "",
  onboarded: false,
  daily: [],
  odd: [],
  even: [],
  days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
  dates: {},
  archive: [],
  streak: 0,
  lastReviewDate: null,
  authCode: null,
  preferredVersion: 'nkjv'
};

export const useScriptureSystem = () => {
  const [system, setSystem] = useState(() => {
    const saved = localStorage.getItem('scripture_flow_data');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  const [syncStatus, setSyncStatus] = useState('saved');

  useEffect(() => {
    localStorage.setItem('scripture_flow_data', JSON.stringify(system));
    const sync = async () => {
      if (!system.authCode) return;
      setSyncStatus('syncing');
      const { error } = await supabase.from('user_vault').upsert({ auth_code: system.authCode, data: system }, { onConflict: 'auth_code' });
      setSyncStatus(error ? 'error' : 'saved');
    };
    const timer = setTimeout(sync, 2000);
    return () => clearTimeout(timer);
  }, [system]);

  const promoteVerse = (verseId) => {
    setSystem(prev => {
      const newState = { ...prev };
      let verseToMove = null;

      // Find and remove from current location
      ['daily', 'odd', 'even'].forEach(box => {
        const idx = newState[box].findIndex(v => v.id === verseId);
        if (idx !== -1) verseToMove = newState[box].splice(idx, 1)[0];
      });

      if (!verseToMove) return prev;

      // Waterfall logic
      if (prev.daily.includes(verseToMove)) newState.odd.push(verseToMove);
      else if (prev.odd.includes(verseToMove) || prev.even.includes(verseToMove)) {
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const randomDay = dayNames[Math.floor(Math.random() * dayNames.length)];
        newState.days[randomDay].push(verseToMove);
      } else {
        newState.archive.push(verseToMove);
      }
      
      return newState;
    });
  };

  const moveVerse = (boxKey, index, direction) => {
    setSystem(prev => {
      const newBox = [...prev[boxKey]];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= newBox.length) return prev;
      [newBox[index], newBox[newIndex]] = [newBox[newIndex], newBox[index]];
      return { ...prev, [boxKey]: newBox };
    });
  };

  const unmasterVerse = (verseId) => {
    setSystem(prev => ({
      ...prev,
      archive: prev.archive.filter(v => v.id !== verseId),
      daily: [...prev.daily, prev.archive.find(v => v.id === verseId)]
    }));
  };

  const resetSystem = () => {
    setSystem(INITIAL_STATE);
    localStorage.removeItem('scripture_flow_data');
  };

  const isDuplicate = (ref) => {
    const all = [...system.daily, ...system.odd, ...system.even, ...system.archive];
    return all.some(v => v.reference.toLowerCase() === ref.toLowerCase());
  };

  return { system, setSystem, promoteVerse, isDuplicate, syncStatus, resetSystem, moveVerse, unmasterVerse };
};