import { JournalEntry } from '../types';
import { AUTHORS } from '../config';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function EntryCard({ entry }: { entry: JournalEntry }) {
  const author = AUTHORS[entry.author_key];
  const rotation = entry.photo_url ? (entry.id.charCodeAt(0) % 5) - 2 : 0;

  return (
    <div
      className="entry-enter bg-paper rounded-xl p-4 pl-5 polaroid overflow-hidden"
      style={{ borderLeft: `4px solid ${author.color}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-sm" style={{ color: author.color }}>
          {author.name}
        </span>
        {entry.mood && <span>{entry.mood}</span>}
        <span className="text-ink/35 text-xs ml-auto">{formatTime(entry.created_at)}</span>
      </div>

      {entry.content && (
        <p className="text-ink font-body leading-relaxed whitespace-pre-wrap">{entry.content}</p>
      )}

      {entry.photo_url && (
        <img
          src={entry.photo_url}
          alt=""
          className="mt-3 block max-w-full max-h-72 rounded-lg polaroid object-contain"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      )}
    </div>
  );
}
