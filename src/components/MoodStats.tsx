import { useMemo, useState } from 'react';
import { JournalEntry } from '../types';
import { MOODS } from '../config';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MoodStats({ entries }: { entries: JournalEntry[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    entries.forEach(entry => {
      if (entry.mood && MOODS.includes(entry.mood)) {
        counts[entry.mood] = (counts[entry.mood] || 0) + 1;
        total++;
      }
    });

    return MOODS.map(mood => ({
      mood,
      count: counts[mood] || 0,
      percentage: total > 0 ? ((counts[mood] || 0) / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="mood-stats bg-paper/10 border border-paper/10 rounded-xl overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-paper/60 hover:text-paper transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart2 size={16} />
          Météo des humeurs
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.mood} className="space-y-1">
                  <div className="flex justify-between text-xs text-paper/40">
                    <span>{stat.mood}</span>
                    <span>{stat.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-paper/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.percentage}%` }}
                      className="h-full bg-rose/40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
