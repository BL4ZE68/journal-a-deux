import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-xl bg-paper rounded-t-xl p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] polaroid flex items-center gap-3 z-50 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-xl sm:pb-3">
      <img src="/icon-journal-heart.png" alt="" className="w-8 h-8 object-contain" />
      <p className="text-ink text-sm flex-1">Installer le journal sur cet écran d'accueil ?</p>
      <button
        onClick={() => setDismissed(true)}
        className="text-ink/40 text-sm px-2 min-h-10 shrink-0"
      >
        Non
      </button>
      <button
        onClick={async () => {
          await promptEvent.prompt();
          setPromptEvent(null);
        }}
        className="bg-ink text-paper text-sm px-3 py-2 rounded-lg font-medium min-h-10 shrink-0"
      >
        Installer
      </button>
    </div>
  );
}
