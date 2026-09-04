import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { AuthorKey, JOURNAL_TITLE } from './config';
import { JournalEntry } from './types';
import Gate, { isUnlocked } from './components/Gate';
import EntryComposer from './components/EntryComposer';
import Timeline from './components/Timeline';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [author, setAuthor] = useState<AuthorKey>('a');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadEntries() {
    setLoadError(null);
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('Impossible de charger le journal. Vérifie la connexion puis réessaie.');
    } else if (data) {
      setEntries(data as JournalEntry[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!unlocked) return;

    loadEntries();

    const channel = supabase
      .channel('entries-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entries' }, (payload) => {
        const entry = payload.new as JournalEntry;
        setEntries((prev) => (prev.some((item) => item.id === entry.id) ? prev : [entry, ...prev]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  if (!unlocked) {
    return <Gate onUnlock={() => setUnlocked(true)} />;
  }

  const firstEntryDate = entries.length > 0
    ? entries.reduce((oldest, entry) => (entry.created_at < oldest ? entry.created_at : oldest), entries[0].created_at)
    : null;
  const daysSince = firstEntryDate
    ? Math.max(1, Math.floor((Date.now() - new Date(firstEntryDate).getTime()) / 86_400_000) + 1)
    : null;

  return (
    <div className="min-h-screen font-body px-3 py-6 sm:px-4 sm:py-14 safe-page">
      <div className="max-w-xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl text-paper">{JOURNAL_TITLE}</h1>
          <p className={`text-xs mt-2 ${online ? 'text-paper/35' : 'text-rose'}`} role="status">
            {online ? 'En ligne' : 'Hors ligne — les nouveaux messages attendront la reconnexion'}
          </p>
          {daysSince && (
            <p className="text-paper/40 text-sm mt-1">
              {entries.length} pages écrites depuis {daysSince} jour{daysSince > 1 ? 's' : ''}
            </p>
          )}
        </header>

        <div className="mb-8">
          <EntryComposer author={author} onAuthorChange={setAuthor} onPosted={loadEntries} />
        </div>

        {loading ? (
          <div className="space-y-3" aria-label="Chargement du journal">
            <div className="skeleton h-5 w-32 mx-auto" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        ) : loadError ? (
          <div className="text-center">
            <p className="text-rose">{loadError}</p>
            <button type="button" onClick={loadEntries} className="text-paper underline mt-2">
              Réessayer
            </button>
          </div>
        ) : (
          <Timeline entries={entries} />
        )}
      </div>
      <InstallPrompt />
    </div>
  );
}
