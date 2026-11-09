# Music App

Lecteur de musique **installable (PWA)** qui fonctionne hors ligne. Tes fichiers audio sont stockés
directement dans le navigateur (IndexedDB) : rien n'est envoyé sur un serveur.

## Fonctionnalités

- Import de fichiers audio (MP3, M4A/AAC, FLAC, OGG/Opus, WAV…) par bouton ou glisser-déposer
- Lecture des tags : titre, artiste, album, durée et pochette
- Bibliothèque par morceaux, albums et artistes, avec recherche
- Playlists (créer, renommer, supprimer, ajouter/retirer des morceaux)
- File d'attente : lire ensuite, ajouter à la file, retirer, sauter à un morceau
- Lecture aléatoire, répétition (tout / un morceau), volume, barre de progression
- Contrôles système (écran verrouillé, casque, touches multimédia) via la Media Session API
- Raccourcis clavier : `Espace` lecture/pause, `Maj + ←/→` précédent/suivant
- Installable sur l'écran d'accueil et utilisable hors ligne
- Thème clair/sombre automatique, interface adaptée au mobile

## Développement

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production dans dist/
npm run preview   # tester le build (service worker inclus)
```

## Stack

React + TypeScript + Vite, `vite-plugin-pwa` (service worker Workbox), `idb` (IndexedDB),
`music-metadata` (lecture des tags).
