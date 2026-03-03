import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const initialState = {
  username: "",
  preferredVersion: "nkjv",
  daily: [],
  odd: [],
  even: [],
  days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
  dates: Array.from({ length: 31 }, (_, i) => i + 1).reduce((acc, curr) => ({ ...acc, [curr]: [] }), {}),
  archive: [],
  onboarded: false,
  streak: 0,
  lastReviewDate: null,
  authCode: ""
};

export function useScriptureSystem() {
  const [system, setSystem] = useState(() => {
    const saved = localStorage.getItem('scripture_system');
    return saved ? JSON.parse(saved) : initialState;
  });

  // 'idle', 'syncing', 'saved', 'error'
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    localStorage.setItem('scripture_system', JSON.stringify(system));
    
    if (system.onboarded && system.authCode) {
      syncToCloud(system);
    }
  }, [system]);

  const syncToCloud = async (currentData) => {
    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('user_vault')
        .upsert({ 
          auth_code: currentData.authCode, 
          data: currentData,
          last_synced: new Date().toISOString()
        }, { onConflict: 'auth_code' });
      
      if (error) {
        console.error("Cloud sync failed:", error.message);
        setSyncStatus('error');
      } else {
        // Show 'saved' for 2 seconds then go back to idle
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const isDuplicate = (ref) => {
    const allVerses = [
      ...system.daily, ...system.odd, ...system.even,
      ...Object.values(system.days).flat(),
      ...Object.values(system.dates).flat(),
      ...system.archive
    ];
    return allVerses.some(v => v.reference.toLowerCase() === ref.toLowerCase());
  };

  const promoteVerse = (verseId) => {
    const newSystem = { ...system };
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const isOdd = new Date().getDate() % 2 !== 0;
    const sourceSlot = isOdd ? 'odd' : 'even';

    if (newSystem.days.sunday.length > 0) {
      const counts = Object.values(newSystem.dates).map(d => d.length);
      const min = Math.min(...counts);
      const targetDate = Object.keys(newSystem.dates).find(k => newSystem.dates[k].length === min);
      newSystem.dates[targetDate].push(newSystem.days.sunday.shift());
    }
    for (let i = dayOrder.length - 1; i > 0; i--) {
      if (newSystem.days[dayOrder[i-1]].length > 0) {
        newSystem.days[dayOrder[i]].push(newSystem.days[dayOrder[i-1]].shift());
      }
    }
    if (newSystem[sourceSlot].length > 0) newSystem.days.monday.push(newSystem[sourceSlot].shift());
    if (newSystem.daily.length > 0) newSystem[sourceSlot].push(newSystem.daily.shift());

    setSystem(newSystem);
  };

  return { system, setSystem, promoteVerse, isDuplicate, syncStatus };
}