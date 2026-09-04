import { FormEvent, useState } from 'react';

const STORAGE_KEY = 'journal-a-deux:unlocked';

interface GateProps {
  onUnlock: () => void;
}

export function isUnlocked() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export default function Gate({ onUnlock }: GateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const expected = import.meta.env.VITE_APP_PASSCODE as string | undefined;
  const configurationError = !expected;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (expected && code.trim() === expected) {
      localStorage.setItem(STORAGE_KEY, 'true');
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 font-body">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-paper rounded-2xl p-8 polaroid text-center"
      >
        <p className="font-display text-2xl text-ink mb-1">Notre journal</p>
        <p className="text-ink/60 text-sm mb-6">
          {configurationError
            ? "Le code d'accès n'est pas configuré. Contacte l'administrateur."
            : 'Un petit mot de passe pour rester juste entre nous.'}
        </p>
        <input
          autoFocus
          type="password"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          placeholder="Code secret"
          className="w-full rounded-lg border border-ink/15 bg-white/70 px-4 py-3 text-center text-ink outline-none focus:border-rose transition-colors"
        />
        {error && <p className="text-rose text-sm mt-2">Ce n'est pas le bon code, essaie encore.</p>}
        <button
          type="submit"
          disabled={configurationError}
          className="mt-5 w-full rounded-lg bg-ink text-paper py-3 font-medium hover:bg-ink/90 transition-colors"
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
