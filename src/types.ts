import type { AuthorKey } from './config';

export interface JournalEntry {
  id: string;
  author_key: AuthorKey;
  content: string | null;
  photo_url: string | null;
  photo_urls?: string[];
  mood: string | null;
  reactions_a: number;
  reactions_b: number;
  created_at: string;
}
