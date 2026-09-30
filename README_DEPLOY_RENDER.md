# PeopleFlow Agent — déploiement public Render

Ce dossier contient uniquement le backend public du prototype PeopleFlow.

## Avant déploiement

- Le backend utilise des données de démonstration en mémoire.
- Aucune base de données n'est requise.
- Aucune clé API n'est requise.
- Les origines CORS autorisées incluent le prototype Figma publié et le développement local.

## Déploiement recommandé

1. Créer un dépôt GitHub contenant le contenu de ce dossier.
2. Sur Render : New > Blueprint (ou Web Service).
3. Connecter le dépôt GitHub.
4. Si Blueprint est utilisé, Render lit `render.yaml` automatiquement.
5. Choisir le plan Free pour la démonstration.
6. Attendre que `/api/health` soit vert.
7. Copier l'URL publique, par exemple `https://peopleflow-agent.onrender.com`.

## Test après déploiement

Ouvrir :

`https://VOTRE-URL.onrender.com/api/health`

Attendu :

`{"ok":true,"service":"peopleflow-agent",...}`

## Connexion au prototype Figma

Une fois l'URL Render obtenue, remplacer l'URL locale du backend dans le frontend PeopleFlow par cette URL HTTPS, puis republier Figma Make.

Les deux fichiers frontend qui utilisent actuellement `VITE_PEOPLEFLOW_AGENT_URL` sont :

- `src/hooks/usePeopleFlowAI.tsx`
- `src/ai/contextualAI.tsx`

Conserver `import.meta.env.VITE_PEOPLEFLOW_AGENT_URL` en priorité et utiliser l'URL Render comme fallback public.
