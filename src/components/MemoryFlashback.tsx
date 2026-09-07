import { useMemo } from 'react';
import { JournalEntry } from '../types';
import { motion } from 'framer-motion';
import { History, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, subMonths, subYears, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MemoryFlashbackProps {
  entries: JournalEntry[];
}

export default function MemoryFlashback({ entries }: MemoryFlashbackProps) {
  const memory = useMemo(() => {
    if (entries.length < 5) return null;

    const today = new Date();
    const intervals = [
      { date: subMonths(today, 1), label: 'Il y a 1 mois' },
      { date: subMonths(today, 3), label: 'Il y a 3 mois' },
      { date: subMonths(today, 6), label: 'Il y a 6 mois' },
      { date: subYears(today, 1), label: 'Il y a 1 an' },
    ];

    for (const interval of intervals) {
      const match = entries.find(e => isSameDay(new Date(e.created_at), interval.date));
      if (match) return { entry: match, label: interval.label };
    }

    // Si pas de match exact, on prend un souvenir au hasard datant d'il y a plus de 2 semaines
    const oldEntries = entries.filter(e => {
      const date = new Date(e.created_at);
      return date < subMonths(today, 0.5);
    });

    if (oldEntries.length > 0) {
      const randomEntry = oldEntries[Math.floor(Math.random() * oldEntries.length)];
      return {
        entry: randomEntry,
        label: `Un souvenir ${formatDistanceToNow(new Date(randomEntry.created_at), { addSuffix: true, locale: fr })}`
      };
    }

    return null;
  }, [entries]);

  if (!memory) return null;

  const scrollToEntry = () => {
    const element = document.getElementById(`entry-${memory.entry.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => element.classList.remove('highlight-flash'), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flashback mb-8 bg-rose/5 border border-rose/10 rounded-2xl p-4 cursor-pointer hover:bg-rose/10 transition-colors group"
      onClick={scrollToEntry}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-rose/10 flex items-center justify-center text-rose shrink-0">
          <History size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-rose/60 mb-0.5">Capsule temporelle</p>
          <p className="text-sm font-medium text-ink/80 truncate">
            {memory.label} : "{memory.entry.content || 'Une photo...'}"
          </p>
        </div>
        <ChevronRight size={18} className="text-rose/40 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}
