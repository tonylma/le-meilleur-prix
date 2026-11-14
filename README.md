# Le Meilleur Prix

**Comparez les prix des produits du quotidien en Côte d’Ivoire, partagez vos relevés et trouvez les meilleures offres près de chez vous.**

Le Meilleur Prix est une application communautaire pour consulter et partager des prix relevés dans les marchés, boutiques et supermarchés. Les contributions incluent le produit, son prix et son unité, le commerce, la ville et éventuellement le quartier ou un pseudonyme.

## Fonctionnalités

- Recherche par produit et ville, tri par prix ou date.
- Favoris conservés localement dans le navigateur.
- Partage de prix avec validation côté client et serveur.
- Statistiques de prix par produit et ville.
- Interface responsive et navigation clavier/mobile.

## Démarrage

Prérequis : Node.js 18 ou plus récent et npm.

```bash
cd backend
npm install
npm start
```

L’API écoute sur `http://localhost:3001`. Pour l’interface en développement, dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

Le client utilise `/api` par défaut (même origine que le serveur). Définissez `VITE_API_URL` si l’API est hébergée sur une autre URL. Pour autoriser l’origine du client en production, définissez `FRONTEND_ORIGINS` comme une liste d’origines séparées par des virgules. Le serveur sert aussi `frontend/dist` lorsqu’il existe.

## Tests et build

```bash
cd backend && npm test
cd frontend && npm run build
```

La base de démonstration est `backend/db.json`. Les prix partagés sont écrits dans ce fichier ; pour une instance durable à plusieurs processus, remplacez ce stockage JSON par une base de données.
