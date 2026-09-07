import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { supabase, PHOTOS_BUCKET } from '../lib/supabase';
import { AUTHORS, MOODS, AuthorKey } from '../config';
import { toast } from 'sonner';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const MAX_CONTENT_LENGTH = 2_000;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const DRAFT_KEY = 'journal-a-deux:draft';

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

interface EntryComposerProps {
  author: AuthorKey;
  onAuthorChange: (author: AuthorKey) => void;
  onPosted: () => void;
  onTyping?: (isTyping: boolean) => void;
  typingPartner?: AuthorKey | null;
}

export default function EntryComposer({ author, onAuthorChange, onPosted, onTyping, typingPartner }: EntryComposerProps) {
  const [content, setContent] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; }
  });
  const [mood, setMood] = useState<string | null>(() => {
    try { return localStorage.getItem(`${DRAFT_KEY}:mood`); } catch { return null; }
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      if (content.trim()) localStorage.setItem(DRAFT_KEY, content);
      else localStorage.removeItem(DRAFT_KEY);
      if (mood) localStorage.setItem(`${DRAFT_KEY}:mood`, mood);
      else localStorage.removeItem(`${DRAFT_KEY}:mood`);
    } catch { /* brouillon facultatif */ }

    // Ghost Typing Logic
    if (onTyping && content.trim()) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [content, mood, onTyping]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image.`);
        return false;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`${file.name} est trop lourde (>10Mo).`);
        return false;
      }
      return true;
    });

    const totalPhotos = photoFiles.length + validFiles.length;
    if (totalPhotos > 3) {
      toast.warning('Maximum 3 photos par souvenir.');
      validFiles.splice(3 - photoFiles.length);
    }

    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPhotoFiles(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    setFeedback(null);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }

  useEffect(() => () => {
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
  }, [photoPreviews]);

  async function handleSubmit() {
    if (!content.trim() && photoFiles.length === 0) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      let photo_urls: string[] = [];

      for (const file of photoFiles) {
        setFeedback({ type: 'success', message: `Optimisation de ${file.name}...` });
        const compressedBlob = await compressImage(file);
        const path = `${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, compressedBlob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;
        photo_urls.push(supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl);
      }

      const { error: insertError } = await supabase.from('entries').insert({
        author_key: author,
        content: content.trim() || null,
        photo_urls,
        photo_url: photo_urls[0] || null, // Fallback pour compatibilité
        mood,
      });
      if (insertError) throw insertError;

      setContent('');
      setMood(null);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(`${DRAFT_KEY}:mood`); } catch { /* facultatif */ }
      onPosted();
      void Haptics.notification({ type: NotificationType.Success });
      toast.success('Souvenir ajouté !');
    } catch (err) {
      console.error(err);
      toast.error('Oups, petit souci lors de l\'envoi.');
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

      <div className="relative">
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

        {typingPartner && (
          <div className="absolute -bottom-5 left-2 flex items-center gap-1.5 text-[10px] text-rose/60 font-medium">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-rose/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-rose/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-rose/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {AUTHORS[typingPartner].name} écrit...
          </div>
        )}
      </div>

      {photoPreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {photoPreviews.map((url, index) => (
            <div key={url} className="relative inline-block">
              <img src={url} alt="Aperçu" className="h-20 w-20 object-cover rounded-lg polaroid" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-1.5 -right-1.5 bg-ink text-paper w-5 h-5 rounded-full text-[10px] flex items-center justify-center shadow-lg"
                aria-label="Retirer la photo"
              >
                ✕
              </button>
            </div>
          ))}
          {photoPreviews.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/10 text-ink/20 hover:border-rose/30 hover:text-rose/40 transition-colors"
            >
              <span className="text-xl">+</span>
              <span className="text-[10px]">Photo</span>
            </button>
          )}
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
            disabled={photoPreviews.length >= 3}
            aria-label="Ajouter une photo"
            className="text-ink/50 hover:text-ink text-sm ml-1 px-2 min-h-10 touch-target disabled:opacity-20"
          >
            📷 {photoPreviews.length === 0 ? 'photo' : 'ajouter'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        <span className="text-ink/40 text-xs tabular-nums shrink-0">
          {content.length}/{MAX_CONTENT_LENGTH}
        </span>

        <button
          type="button"
          disabled={submitting || (!content.trim() && photoFiles.length === 0)}
          onClick={handleSubmit}
          className="rounded-lg bg-ink text-paper px-4 py-2.5 text-sm font-medium min-h-10 shrink-0 disabled:opacity-30 hover:bg-ink/90 transition-colors shadow-sm"
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
