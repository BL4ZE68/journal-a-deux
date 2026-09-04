import type { AuthorKey } from './config';

export interface JournalEntry {
  id: string;
  author_key: AuthorKey;
  content: string | null;
  photo_url: string | null;
  mood: string | null;
  created_at: string;
}
