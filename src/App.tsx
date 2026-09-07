import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import { AUTHORS, AuthorKey, JOURNAL_TITLE, MOODS } from './config';
import { JournalEntry } from './types';
import Gate, { isUnlocked } from './components/Gate';
import EntryComposer from './components/EntryComposer';
import Timeline from './components/Timeline';
import InstallPrompt from './components/InstallPrompt';
import MoodStats from './components/MoodStats';
import MemoryFlashback from './components/MemoryFlashback';
import { useJournal } from './hooks/useJournal';
import { Toaster } from 'sonner';

function downloadJournal(entries: JournalEntry[]) {
  const lines = [`${JOURNAL_TITLE}\n`, ...entries.map((entry) => {
    const date = new Date(entry.created_at).toLocaleString('fr-FR');
    const author = AUTHORS[entry.author_key].name;
    return `[${date}] ${author}${entry.mood ? ` ${entry.mood}` : ''}\n${entry.content || '(photo uniquement)'}${entry.photo_url ? `\nPhoto : ${entry.photo_url}` : ''}\n`;
  })];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `notre-journal-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function printJournal() {
  window.print();
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [author, setAuthor] = useState<AuthorKey>('a');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [query, setQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState<AuthorKey | 'all'>('all');
  const [moodFilter, setMoodFilter] = useState<string | 'all'>('all');

  const {
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
  } = useJournal(unlocked, author);

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

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr-FR');
    return entries.filter((entry) => {
      const matchesQuery = !normalized || (entry.content || '').toLocaleLowerCase('fr-FR').includes(normalized);
      const matchesAuthor = authorFilter === 'all' || entry.author_key === authorFilter;
      const matchesMood = moodFilter === 'all' || entry.mood === moodFilter;
      return matchesQuery && matchesAuthor && matchesMood;
    });
  }, [entries, query, authorFilter, moodFilter]);

  const firstEntryDate = useMemo(() => entries.length ? entries.reduce((oldest, entry) => entry.created_at < oldest ? entry.created_at : oldest, entries[0].created_at) : null, [entries]);
  const daysSince = firstEntryDate ? Math.max(1, Math.floor((Date.now() - new Date(firstEntryDate).getTime()) / 86_400_000) + 1) : null;
  const hasFilters = Boolean(query || authorFilter !== 'all' || moodFilter !== 'all');

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;

  const partnerName = author === 'a' ? AUTHORS.b.name : AUTHORS.a.name;
  const isPartnerOnline = onlinePartners.length > 0;

  return (
    <div className="min-h-screen font-body px-3 py-6 sm:px-4 sm:py-14 safe-page">
      <Toaster position="top-center" richColors />
      <div className="max-w-xl mx-auto">
        <header className="mb-8 text-center">
          <div className="title-line"><span /> <img src="/icon-journal-heart.png" alt="" className="heart-img" /> <span /></div>
          <h1 className="font-display text-3xl text-paper">{JOURNAL_TITLE}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className={`text-xs ${online ? 'text-paper/35' : 'text-rose'}`} role="status">
              {online ? 'En ligne' : 'Hors ligne — les pages seront synchronisées au retour'}
            </p>
            {isPartnerOnline && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {partnerName} est là
              </span>
            )}
          </div>
          {daysSince && <p className="text-paper/40 text-sm mt-1">{entries.length} page{entries.length > 1 ? 's' : ''} écrite{entries.length > 1 ? 's' : ''} depuis {daysSince} jour{daysSince > 1 ? 's' : ''}</p>}
        </header>

        <div className="mb-8">
          <EntryComposer
            author={author}
            onAuthorChange={setAuthor}
            onPosted={() => void loadEntries()}
            onTyping={sendTypingStatus}
            typingPartner={typingPartner}
          />
        </div>

        <MemoryFlashback entries={entries} />
        <MoodStats entries={entries} />

        <section className="journal-tools" aria-label="Recherche et filtres">
          <div className="search-row"><label htmlFor="journal-search" className="sr-only">Rechercher dans le journal</label><input id="journal-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un souvenir…" className="search-input" /><button type="button" onClick={() => { setQuery(''); setAuthorFilter('all'); setMoodFilter('all'); }} className="clear-filters" disabled={!hasFilters}>Réinitialiser</button></div>
          <div className="filter-row"><select value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value as AuthorKey | 'all')} className="filter-select" aria-label="Filtrer par auteur"><option value="all">Tout le monde</option>{(Object.keys(AUTHORS) as AuthorKey[]).map((key) => <option key={key} value={key}>{AUTHORS[key].name}</option>)}</select><select value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)} className="filter-select" aria-label="Filtrer par humeur"><option value="all">Toutes les humeurs</option>{MOODS.map((mood) => <option key={mood} value={mood}>{mood}</option>)}</select></div>
        </section>

        <div className="journal-toolbar"><span className="text-paper/45 text-xs">{hasFilters ? `${filteredEntries.length} résultat${filteredEntries.length > 1 ? 's' : ''}` : 'Vos souvenirs, au même endroit'}</span><div className="toolbar-actions"><button type="button" onClick={() => printJournal()} disabled={!entries.length} className="refresh-button">PDF</button><button type="button" onClick={() => downloadJournal(entries)} disabled={!entries.length} className="refresh-button">Texte</button><button type="button" onClick={() => void loadEntries(true)} disabled={refreshing} className="refresh-button" aria-label="Rafraîchir le journal"><span className={refreshing ? 'spin' : ''}>↻</span> {refreshing ? 'Actualisation…' : 'Actualiser'}</button></div></div>

        {loading ? <div className="space-y-3" aria-label="Chargement du journal"><div className="skeleton h-5 w-32 mx-auto" /><div className="skeleton h-24 w-full rounded-xl" /><div className="skeleton h-24 w-full rounded-xl" /></div> : <>{loadError && <p className="offline-note" role="status">{loadError}</p>}<Timeline entries={filteredEntries} hasFilters={hasFilters} onDelete={deleteEntry} onUpdate={updateEntry} onReaction={addReaction} currentAuthor={author} searchQuery={query} /></>}
      </div>
      <InstallPrompt />
    </div>
  );
}
