import { useState } from 'react';
import { JournalEntry } from '../types';
import { MOODS } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';

interface EditEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onSave: (id: string, content: string, mood: string | null) => Promise<boolean>;
}

export default function EditEntryModal({ entry, onClose, onSave }: EditEntryModalProps) {
  const [content, setContent] = useState(entry.content || '');
  const [mood, setMood] = useState<string | null>(entry.mood);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    const success = await onSave(entry.id, content, mood);
    if (success) onClose();
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-paper w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden polaroid"
        >
          <div className="flex items-center justify-between p-4 border-b border-ink/5">
            <h3 className="font-display text-xl text-ink">Modifier le souvenir</h3>
            <button onClick={onClose} className="p-1 hover:bg-ink/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-ink/10 bg-white/60 px-3 py-2 text-ink outline-none focus:border-rose transition-colors font-body"
              placeholder="Modifier le texte..."
            />

            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? null : m)}
                  className="text-2xl w-10 h-10 rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: mood === m ? 'rgba(212,175,122,0.35)' : 'transparent' }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 bg-ink/5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={submitting || (!content.trim() && !entry.photo_url)}
              className="flex items-center gap-2 px-6 py-2 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors shadow-lg"
            >
              {submitting ? 'Enregistrement...' : (
                <>
                  <Save size={16} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
