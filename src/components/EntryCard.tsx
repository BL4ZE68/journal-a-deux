import { useState } from 'react';
import { JournalEntry } from '../types';
import { AUTHORS, AuthorKey } from '../config';
import { Edit2, Trash2, MoreVertical, Heart } from 'lucide-react';
import EditEntryModal from './EditEntryModal';
import PhotoLightbox from './PhotoLightbox';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface EntryCardProps {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, mood: string | null) => Promise<boolean>;
  onReaction: (id: string, authorKey: AuthorKey) => void;
  currentAuthor: AuthorKey;
  searchQuery?: string;
}

export default function EntryCard({ entry, onDelete, onUpdate, onReaction, currentAuthor, searchQuery }: EntryCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPumping, setIsPumping] = useState(false);
  const author = AUTHORS[entry.author_key];
  const rotation = entry.photo_url ? (entry.id.charCodeAt(0) % 5) - 2 : 0;

  const highlightText = (text: string | null, query: string | undefined) => {
    if (!text || !query?.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-rose/20 text-ink rounded-sm px-0.5">{part}</mark>
        : part
    );
  };

  const handleDelete = () => {
    if (window.confirm('Es-tu sûr de vouloir supprimer ce souvenir ?')) {
      onDelete(entry.id);
    }
  };

  const handleHeartClick = () => {
    setIsPumping(true);
    void Haptics.impact({ style: ImpactStyle.Medium });
    onReaction(entry.id, currentAuthor);
    setTimeout(() => setIsPumping(false), 600);
  };

  return (
    <>
      <div
        className="group relative entry-enter bg-paper rounded-xl p-4 pl-5 polaroid overflow-visible"
        style={{ borderLeft: `4px solid ${author.color}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm" style={{ color: author.color }}>
            {author.name}
          </span>
          {entry.mood && <span>{entry.mood}</span>}
          <span className="text-ink/35 text-xs ml-auto">{formatTime(entry.created_at)}</span>

          <div className="relative ml-1">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-ink/20 hover:text-ink/50 transition-colors rounded-full hover:bg-ink/5"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-ink/5 rounded-lg shadow-xl py-1 min-w-[120px] overflow-hidden">
                <button
                  onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink/70 hover:bg-ink/5 transition-colors"
                >
                  <Edit2 size={12} /> Modifier
                </button>
                <button
                  onClick={() => { handleDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose/70 hover:bg-rose/5 transition-colors"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {entry.content && (
          <p className="text-ink font-body leading-relaxed whitespace-pre-wrap">
            {highlightText(entry.content, searchQuery)}
          </p>
        )}

        {(entry.photo_urls?.length || 0) > 0 ? (
          <div className={`mt-3 grid gap-2 ${entry.photo_urls!.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {entry.photo_urls!.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`Photo ${i+1} ajoutée par ${author.name}`}
                onClick={() => {
                  setSelectedPhoto(url);
                  setShowLightbox(true);
                }}
                className={`block w-full rounded-lg polaroid object-cover cursor-zoom-in hover:opacity-95 transition-opacity ${
                  entry.photo_urls!.length === 1 ? 'max-h-72' : 'aspect-square'
                }`}
                style={{ transform: `rotate(${rotation * (i + 1) * 0.5}deg)` }}
              />
            ))}
          </div>
        ) : entry.photo_url && (
          <img
            src={entry.photo_url}
            alt={`Photo ajoutée par ${author.name}`}
            onClick={() => {
              setSelectedPhoto(entry.photo_url!);
              setShowLightbox(true);
            }}
            className="mt-3 block max-w-full max-h-72 rounded-lg polaroid object-contain cursor-zoom-in hover:opacity-95 transition-opacity"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}

        <div className="reactions-btn mt-4 pt-3 border-t border-ink/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 group/heart">
              <motion.button
                whileTap={{ scale: 1.4 }}
                animate={isPumping ? { scale: [1, 1.4, 1] } : {}}
                onClick={handleHeartClick}
                className="p-1 rounded-full text-rose/30 hover:text-rose hover:bg-rose/5 transition-colors"
              >
                <Heart
                  size={18}
                  fill={entry.reactions_a > 0 || entry.reactions_b > 0 ? "currentColor" : "none"}
                  className={entry.reactions_a > 0 || entry.reactions_b > 0 ? "text-rose" : ""}
                />
              </motion.button>

              <div className="flex gap-2 text-[10px] font-medium uppercase tracking-wider text-ink/40">
                {entry.reactions_a > 0 && (
                  <span className="bg-ink/5 px-1.5 py-0.5 rounded-full" style={{ color: AUTHORS.a.color }}>
                    {AUTHORS.a.name.charAt(0)} {entry.reactions_a}
                  </span>
                )}
                {entry.reactions_b > 0 && (
                  <span className="bg-ink/5 px-1.5 py-0.5 rounded-full" style={{ color: AUTHORS.b.color }}>
                    {AUTHORS.b.name.charAt(0)} {entry.reactions_b}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditEntryModal
          entry={entry}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdate}
        />
      )}

      {showLightbox && selectedPhoto && (
        <PhotoLightbox
          url={selectedPhoto}
          onClose={() => {
            setShowLightbox(false);
            setSelectedPhoto(null);
          }}
        />
      )}
    </>
  );
}
