// 👉 Personnalise ici : remplace les noms (et les couleurs si tu veux)
// par les prénoms réels. C'est le seul fichier à modifier pour ça.
export const AUTHORS = {
  a: { name: 'Moi', color: '#C6555F' },
  b: { name: 'Toi', color: '#7C8F5E' },
} as const;

export type AuthorKey = keyof typeof AUTHORS;

// Emojis rapides pour marquer l'humeur du jour (libre à toi d'en changer)
export const MOODS = ['💛', '😂', '🥹', '😴', '🔥', '🌧️'];

// Nom affiché en haut de l'app
export const JOURNAL_TITLE = 'Notre journal';
