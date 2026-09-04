import { JournalEntry } from '../types';
import EntryCard from './EntryCard';

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Timeline({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-paper/50 font-display text-lg">La première page est encore blanche.</p>
        <p className="text-paper/30 text-sm mt-1">Écris le tout premier mot ci-dessus.</p>
      </div>
    );
  }

  const groups: { label: string; items: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(entry);
    } else {
      groups.push({ label, items: [entry] });
    }
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-paper/50 font-display text-sm mb-3 capitalize">{group.label}</p>
          <div className="space-y-3">
            {group.items.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
