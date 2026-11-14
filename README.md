# Le Meilleur Prix — version 2.0

**Comparez les prix des produits du quotidien en Côte d’Ivoire, partagez vos relevés et trouvez les meilleures offres près de chez vous.**

Plateforme communautaire React/Vite + Express. Cette version ajoute un stockage PostgreSQL, des comptes sécurisés, des outils de modération, une page Contact, un espace utilisateur, des filtres avancés et des tendances de prix.

## Fonctionnalités

- Recherche avec filtres produit, ville, quartier, commerce, intervalle de prix et période.
- Graphique d’évolution quotidienne, hebdomadaire ou mensuelle avec prix moyen/minimum/maximum.
- Inscription/connexion avec mots de passe hachés via scrypt et cookie de session HTTP-only.
- Contributions authentifiées en attente de modération; contributions publiques compatibles avec le mode démo.
- Signalement des prix via l’API, console d’administration des contributions, dashboard utilisateur.
- Pages Accueil, À propos, Contact, Connexion, Inscription, statistiques et tableau de bord.
- Interface responsive, palette orange/blanc/bleu et sélecteur français/anglais (navigation et préférences).
- En-têtes de sécurité, validation serveur, limitation de débit et CORS à liste blanche.

## Démarrage local

Prérequis : Node.js 18+, npm et PostgreSQL (facultatif en mode démo JSON).

```bash
cd backend
npm install
cp .env.example .env
# Créez la base puis appliquez le schéma : psql "$DATABASE_URL" -f schema.sql
npm start
```

Sans `DATABASE_URL`, l’API garde le mode de démonstration `backend/db.json`. PostgreSQL est utilisé dès que `DATABASE_URL` est défini. Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

L’API écoute sur `http://localhost:3001`; Vite utilise `/api` par défaut. Configurez `FRONTEND_ORIGINS` avec les origines exactes autorisées. En production, définissez obligatoirement un `JWT_SECRET` unique et long ainsi que `NODE_ENV=production`; HTTPS est requis pour le cookie sécurisé. `PGSSL=true` active le TLS PostgreSQL avec validation du certificat.

## Routes principales

- `POST /api/auth/signup`, `POST /api/auth/signin`, `POST /api/auth/signout`, `GET /api/auth/me`
- `GET/POST /api/prices`; filtres `product`, `city`, `neighborhood`, `storeType`, `minPrice`, `maxPrice`, `from`, `to`, `_limit`
- `GET /api/stats/:productName?city=...&period=day|week|month`
- `POST /api/reports`, `POST /api/contact`, `GET /api/dashboard`
- Modération avec rôle : `GET /api/admin/queue`, `PATCH /api/admin/prices/:id`, `PATCH /api/admin/reports/:id`

Les rôles par défaut sont `user`. Promouvez un compte administrateur de manière contrôlée dans PostgreSQL (`UPDATE users SET role='admin' WHERE email=...`); l’inscription publique ne permet jamais de choisir son rôle. En mode JSON, utilisez une base PostgreSQL pour activer les fonctions de modération réelles et la persistance durable.

## Tests et build

```bash
cd backend && npm test
cd frontend && npm run build
```
