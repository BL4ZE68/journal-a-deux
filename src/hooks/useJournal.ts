import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { JournalEntry } from '../types';
import { AuthorKey } from '../config';
import { toast } from 'sonner';

const CACHE_KEY = 'journal-a-deux:entries-cache';

function readCachedEntries(): JournalEntry[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch { return []; }
}

export function useJournal(unlocked: boolean, currentAuthor: AuthorKey) {
  const [entries, setEntries] = useState<JournalEntry[]>(readCachedEntries);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [onlinePartners, setOnlinePartners] = useState<string[]>([]);
  const [typingPartner, setTypingPartner] = useState<AuthorKey | null>(null);

  const entriesRef = useRef(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  const loadEntries = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(entriesRef.current.length
        ? 'Connexion indisponible : affichage des souvenirs en cache.'
        : 'Impossible de charger le journal.');
      toast.error("Erreur de connexion");
    } else if (data) {
      const nextEntries = data as JournalEntry[];
      setEntries(nextEntries);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(nextEntries)); } catch { /* cache */ }
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('Souvenir supprimé');
    }
  };

  const updateEntry = async (id: string, content: string, mood: string | null) => {
    const { error } = await supabase.from('entries').update({ content, mood }).eq('id', id);
    if (error) {
      toast.error("Erreur lors de la modification");
      return false;
    }
    toast.success('Souvenir mis à jour');
    return true;
  };

  const addReaction = async (id: string, authorKey: AuthorKey) => {
    const entry = entriesRef.current.find(e => e.id === id);
    if (!entry) return;

    const column = authorKey === 'a' ? 'reactions_a' : 'reactions_b';
    const nextValue = (entry[column] || 0) + 1;

    const { error } = await supabase
      .from('entries')
      .update({ [column]: nextValue })
      .eq('id', id);

    if (error) console.error('Erreur réaction:', error);
  };

  useEffect(() => {
    if (!unlocked) return;
    void loadEntries();

    // Realtime changes
    const channel = supabase.channel('journal-main')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entries' }, (payload) => {
        const entry = payload.new as JournalEntry;
        setEntries((prev) => {
          const next = prev.some((item) => item.id === entry.id) ? prev : [entry, ...prev];
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* cache */ }
          return next;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'entries' }, (payload) => {
        const entry = payload.new as JournalEntry;
        setEntries((prev) => prev.map(e => e.id === entry.id ? entry : e));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'entries' }, (payload) => {
        const id = payload.old.id;
        setEntries((prev) => prev.filter(e => e.id !== id));
      })
      // Presence & Typing
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Object.values(state).flat().map((p: any) => p.user) as string[];
        setOnlinePartners(online.filter(u => u !== currentAuthor));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.author !== currentAuthor) {
          setTypingPartner(payload.typing ? payload.author : null);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: currentAuthor, online_at: new Date().toISOString() });
        }
      });

    return () => { void supabase.removeChannel(channel); };
  }, [unlocked, loadEntries, currentAuthor]);

  const sendTypingStatus = (isTyping: boolean) => {
    void supabase.channel('journal-main').send({
      type: 'broadcast',
      event: 'typing',
      payload: { author: currentAuthor, typing: isTyping }
    });
  };

  return {
    entries,
    loading,
    refreshing,
    loadError,
    loadEntries,
    deleteEntry,
    updateEntry,
    addReaction,
    onlinePartners,
    typingPartner,
    sendTypingStatus
  };
}
