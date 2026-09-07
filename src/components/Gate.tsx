import { FormEvent, useEffect, useState } from 'react';
import { AndroidBiometryStrength, BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';

const STORAGE_KEY = 'journal-a-deux:unlocked';
const BIOMETRIC_KEY = 'journal-a-deux:biometric-enabled';

interface GateProps {
  onUnlock: () => void;
}

export function isUnlocked() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

export function isBiometricEnabled() {
  try { return localStorage.getItem(BIOMETRIC_KEY) === 'true'; } catch { return false; }
}

function enableBiometric() {
  try { localStorage.setItem(BIOMETRIC_KEY, 'true'); } catch { /* facultatif */ }
}

export default function Gate({ onUnlock }: GateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled] = useState(isBiometricEnabled());
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);

  const expected = import.meta.env.VITE_APP_PASSCODE as string | undefined;
  const configurationError = !expected;

  useEffect(() => {
    let active = true;
    void BiometricAuth.checkBiometry().then((result) => {
      if (active) setBiometricAvailable(result.isAvailable && result.strongBiometryIsAvailable);
    }).catch(() => { if (active) setBiometricAvailable(false); });
    return () => { active = false; };
  }, []);

  function unlockWithCode(event: FormEvent) {
    event.preventDefault();
    if (checking) return;
    setChecking(true);
    if (expected && code.trim() === expected) {
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* session continue même si le stockage est indisponible */ }
      enableBiometric();
      onUnlock();
    } else {
      setError(true);
      setChecking(false);
    }
  }

  async function unlockWithBiometric() {
    if (checking || !biometricAvailable || !biometricEnabled) return;
    setChecking(true);
    setBiometricMessage(null);
    try {
      await BiometricAuth.authenticate({
        reason: 'Déverrouiller votre journal privé',
        cancelTitle: 'Annuler',
        allowDeviceCredential: true,
        androidTitle: 'Journal à deux',
        androidSubtitle: 'Confirme ton identité pour continuer',
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.strong,
      });
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* session continue */ }
      onUnlock();
    } catch (authError) {
      if (!(authError instanceof BiometryError) || authError.code !== BiometryErrorType.userCancel) {
        setBiometricMessage('Empreinte non reconnue. Utilise le code pour réessayer.');
      }
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 font-body safe-page">
      <form onSubmit={unlockWithCode} className="w-full max-w-sm bg-paper rounded-2xl p-8 polaroid text-center">
        <img src="/icon-journal-heart.png" alt="" className="lock-mark-img" aria-hidden="true" />
        <p className="font-display text-2xl text-ink mb-1">Notre journal</p>
        <p className="text-ink/60 text-sm mb-6">{configurationError ? "Le code d'accès n'est pas configuré. Contacte l'administrateur." : 'Un petit mot de passe pour rester juste entre nous.'}</p>
        <input autoFocus type="password" inputMode="numeric" autoComplete="current-password" value={code} onChange={(event) => { setCode(event.target.value); setError(false); }} placeholder="Code secret" aria-label="Code secret" className="w-full rounded-lg border border-ink/15 bg-white/70 px-4 py-3 text-center text-ink outline-none focus:border-rose transition-colors" />
        {error && <p className="text-rose text-sm mt-2" role="alert">Ce n'est pas le bon code, essaie encore.</p>}
        <button type="submit" disabled={configurationError || checking} className="mt-5 w-full rounded-lg bg-ink text-paper py-3 font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">{checking ? 'Vérification…' : 'Entrer avec le code'}</button>
        {biometricAvailable && biometricEnabled && <button type="button" onClick={() => void unlockWithBiometric()} disabled={checking} className="biometric-button" aria-label="Déverrouiller avec l’empreinte">{checking ? 'Authentification…' : '◉ Déverrouiller par empreinte'}</button>}
        {biometricAvailable && !biometricEnabled && <p className="biometric-hint">Entre une première fois avec le code pour activer l’empreinte.</p>}
        {biometricMessage && <p className="text-rose text-sm mt-2" role="alert">{biometricMessage}</p>}
      </form>
    </div>
  );
}

export { STORAGE_KEY, BIOMETRIC_KEY };
