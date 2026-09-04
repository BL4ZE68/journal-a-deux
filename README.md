# journal-a-deux

Une petite app où vous ajoutez chacun des mots et des photos au fil des jours,
dans un seul et même journal. Texte, photo, humeur du jour, timeline groupée
par jour, mise à jour en temps réel.

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → New Project.
2. Une fois créé : **SQL Editor** → colle le contenu de `supabase/schema.sql` → Run.
   Ça crée la table `entries`, les policies, et le bucket de stockage des photos.
3. **Project Settings > API** → récupère l'URL du projet et la clé `anon public`.

## 2. Configurer l'app

Dans PowerShell Windows :

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Remplis `.env` avec ton URL et ta clé Supabase. `VITE_APP_PASSCODE` est un code
d'accès simple pour que le lien reste privé (pas une vraie sécurité bancaire,
mais suffisant pour un projet perso).

Personnalise ensuite `src/config.ts` : remplace `Moi` / `Toi` par vos deux
prénoms, et change les couleurs si tu veux.

## 3. Lancer en local

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
npm install
npm run dev
```

## 4. Android avec Capacitor

Le projet Android utilise l'identifiant `com.journaladeux.app`. Installe
Android Studio avec le SDK Android ; Android Studio fournit le JDK compatible.
Pour les builds depuis PowerShell, vérifie que `JAVA_HOME` et
`ANDROID_HOME`/`ANDROID_SDK_ROOT` sont configurés (ou que `java` et les outils
du SDK sont disponibles dans le `PATH`).

Pour synchroniser le frontend Vite dans le projet Android :

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
npm install
npm run cap:sync
```

Pour ouvrir l'application dans Android Studio ou la lancer sur un émulateur
ou un appareil USB :

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
npm run android:open
# ou
npm run android:run
```

Pour générer un APK debug directement depuis PowerShell :

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
npm run android:build
```

L'APK est généré ici :
`android\app\build\outputs\apk\debug\app-debug.apk`.

Pour ajouter la plateforme Android dans une nouvelle copie du projet :

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
npm run android:add
```

### Notifications Android

La fonction `supabase/functions/notify-new-entry/index.ts` envoie les nouvelles
entrées à Firebase Cloud Messaging via le topic `journal_updates`. Ne commite
jamais le compte de service Firebase. Dans Supabase Dashboard, ajoute le JSON
du compte de service comme secret Edge Function nommé `FIREBASE_SERVICE_ACCOUNT`,
et ajoute un secret aléatoire `NOTIFY_WEBHOOK_SECRET`. Configure ce même secret
dans l'en-tête personnalisé `x-webhook-secret` du Database Webhook, puis
déploie la fonction :

```powershell
supabase functions deploy notify-new-entry
```

Configure ensuite un Database Webhook Supabase sur `public.entries` pour
l'événement `INSERT`, vers l'URL de cette fonction. L'application Android doit
également s'abonner au topic `journal_updates` avec Firebase Cloud Messaging ;
sinon Firebase n'aura aucun appareil destinataire.

Les variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et
`VITE_APP_PASSCODE` sont intégrées au bundle lors du build. Ne les ajoute pas
au dépôt et ne les partage pas ; configure-les uniquement dans un fichier
`.env` local ou dans l'environnement de build.

## 5. Déployer

Le plus simple est Vercel :

```powershell
Set-Location 'C:\Users\pc-hp\Desktop\journal-a-deux'
npm i -g vercel
vercel
```

Ou connecte le repo GitHub à Vercel directement depuis leur dashboard.
N'oublie pas d'ajouter les mêmes variables d'environnement (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_PASSCODE`) dans les paramètres du projet Vercel.

## Notes

- La sécurité repose sur : (1) le lien n'est connu que de vous deux, (2) le
  code d'accès. Pour quelque chose de plus robuste, il faudrait une vraie
  authentification Supabase (magic link par email) — dis-le-moi si tu veux
  que je l'ajoute.
- Les photos sont stockées dans un bucket public Supabase Storage (URL
  difficile à deviner mais pas privée à 100%).
