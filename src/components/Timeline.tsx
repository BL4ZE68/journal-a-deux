import { JournalEntry } from '../types';
import EntryCard from './EntryCard';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AuthorKey } from '../config';

function dayLabel(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'eeee d MMMM', { locale: fr });
}

interface TimelineProps {
  entries: JournalEntry[];
  hasFilters?: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, mood: string | null) => Promise<boolean>;
  onReaction: (id: string, authorKey: AuthorKey) => void;
  currentAuthor: AuthorKey;
  searchQuery?: string;
}

export default function Timeline({ entries, hasFilters = false, onDelete, onUpdate, onReaction, currentAuthor, searchQuery }: TimelineProps) {
  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <p className="text-paper/50 font-display text-lg">
          {hasFilters ? 'Aucun souvenir trouvé.' : 'La première page est encore blanche.'}
        </p>
        <p className="text-paper/30 text-sm mt-1">
          {hasFilters ? 'Essaie de modifier les filtres.' : 'Écris le tout premier mot ci-dessus.'}
        </p>
      </motion.div>
    );
  }

  const groups: { label: string; items: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-paper/50 font-display text-sm mb-3 capitalize">{group.label}</p>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {group.items.map((entry) => (
                <motion.div
                  key={entry.id}
                  id={`entry-${entry.id}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <EntryCard
                    entry={entry}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onReaction={onReaction}
                    currentAuthor={currentAuthor}
                    searchQuery={searchQuery}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
