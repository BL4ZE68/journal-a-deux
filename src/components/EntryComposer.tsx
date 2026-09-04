import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { supabase, PHOTOS_BUCKET } from '../lib/supabase';
import { AUTHORS, MOODS, AuthorKey } from '../config';

const MAX_CONTENT_LENGTH = 2_000;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

interface EntryComposerProps {
  author: AuthorKey;
  onAuthorChange: (author: AuthorKey) => void;
  onPosted: () => void;
}

export default function EntryComposer({ author, onAuthorChange, onPosted }: EntryComposerProps) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Choisis un fichier image.' });
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setFeedback({ type: 'error', message: 'La photo doit faire moins de 10 Mo.' });
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setFeedback(null);
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  async function handleSubmit() {
    if (!content.trim() && !photoFile) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      let photo_url: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, photoFile);
        if (uploadError) throw uploadError;
        photo_url = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const { error: insertError } = await supabase.from('entries').insert({
        author_key: author,
        content: content.trim() || null,
        photo_url,
        mood,
      });
      if (insertError) throw insertError;

      setContent('');
      setMood(null);
      clearPhoto();
      onPosted();
      setFeedback({ type: 'success', message: 'Page ajoutée au journal.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Un souci est survenu, réessaie dans un instant.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-paper rounded-2xl p-4 sm:p-5 polaroid">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(Object.keys(AUTHORS) as AuthorKey[]).map((key) => {
          const isActive = key === author;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onAuthorChange(key)}
              aria-pressed={isActive}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={
                isActive
                  ? { backgroundColor: AUTHORS[key].color, color: '#F6EDDC' }
                  : { backgroundColor: 'transparent', color: '#2A2138', opacity: 0.5 }
              }
            >
              {AUTHORS[key].name}
            </button>
          );
        })}
        <span className="text-ink/40 text-xs sm:text-sm ml-auto">écrit aujourd'hui</span>
      </div>

      <textarea
        value={content}
        maxLength={MAX_CONTENT_LENGTH}
        onChange={(e) => {
          setContent(e.target.value);
          setFeedback(null);
        }}
        aria-label="Texte de la page"
        placeholder="Un mot doux, une pensée, ta journée..."
        rows={3}
        className="w-full resize-none rounded-lg border border-ink/10 bg-white/60 px-3 py-2 text-ink placeholder:text-ink/35 outline-none focus:border-rose transition-colors font-body"
      />

      {photoPreview && (
        <div className="relative mt-3 inline-block">
          <img src={photoPreview} alt="Aperçu" className="max-h-40 rounded-lg" />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute -top-2 -right-2 bg-ink text-paper w-6 h-6 rounded-full text-xs leading-none"
            aria-label="Retirer la photo"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? null : m)}
              aria-label={`Humeur ${m}`}
              aria-pressed={mood === m}
              className="text-lg w-8 h-8 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: mood === m ? 'rgba(212,175,122,0.35)' : 'transparent' }}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Ajouter une photo"
            className="text-ink/50 hover:text-ink text-sm ml-1 px-2 min-h-10"
          >
            📷 photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        <span className="text-ink/40 text-xs tabular-nums shrink-0">
          {content.length}/{MAX_CONTENT_LENGTH}
        </span>

        <button
          type="button"
          disabled={submitting || (!content.trim() && !photoFile)}
          onClick={handleSubmit}
          className="rounded-lg bg-ink text-paper px-4 py-2.5 text-sm font-medium min-h-10 shrink-0 disabled:opacity-30 hover:bg-ink/90 transition-colors"
        >
          {submitting ? 'Envoi...' : 'Ajouter au journal'}
        </button>
      </div>
      {feedback && (
        <p
          className={`mt-3 text-sm ${feedback.type === 'error' ? 'text-rose' : 'text-green-700'}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
