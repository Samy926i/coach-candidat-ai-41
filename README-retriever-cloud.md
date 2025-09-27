# Job Data Retriever - Lightpanda Cloud

Un retrieveur de données d'emplois robuste qui utilise **Lightpanda Cloud CDP** pour scraper les offres d'emploi. Il extrait des données structurées avec enrichissement d'entreprise, normalise les résultats et produit du JSON propre.

## Différences avec Lightpanda Browser

- **Lightpanda Cloud** (cette implémentation) : Service cloud avec CDP WebSocket + token
- **Lightpanda Browser** (implémentation alternative) : Navigateur self-hosted via Docker + WebSocket

## Fonctionnalités

- **Extraction Schema.org/JobPosting** (JSON-LD) avec fallbacks DOM
- **Enrichissement d'entreprise** depuis les sites officiels, Wikipedia et LinkedIn
- **Extraction intelligente** utilisant des heuristiques pour l'ancienneté, le mode de travail, le salaire, etc.
- **Normalisation des données** incluant codes pays, codes devises, et déduplication des compétences
- **Gestion d'erreurs résiliente** avec gestion d'erreurs structurée et récupération de données partielles
- **Sortie JSON valide** toujours, même en cas d'erreurs

## Installation

```bash
# Installer les dépendances
npm install

# Construire le retriever (optionnel - peut s'exécuter directement avec tsx)
npm run retriever-cloud:build
```

## Prérequis

**Token Lightpanda Cloud** : Vous avez besoin d'un token de Lightpanda Cloud.

### Obtenir votre token

1. Visitez https://lightpanda.io/#cloud-offer
2. Créez un compte et obtenez votre token
3. Le point d'entrée CDP est : `wss://cloud.lightpanda.io/ws?token=YOUR_TOKEN`

### Configuration

```bash
export LIGHTPANDA_TOKEN="votre-token-ici"
```

Ou dans votre script :

```bash
export LIGHTPANDA_TOKEN="votre-token-ici"

## Utilisation

### Ligne de commande

```bash
# Utilisation de la variable d'environnement
export JOB_URL="https://jobs.lever.co/company/senior-engineer"
npm run retriever-cloud:start

# Utilisation de l'argument en ligne de commande
npm run retriever-cloud:start -- --job-url="https://boards.greenhouse.io/company/jobs/123"

# Mode développement (avec tsx)
JOB_URL="https://remote.co/job/123" npm run retriever-cloud:dev
```

### Utilisation programmatique

```typescript
import { JobRetrieverCloud } from './src/retriever/indexCloud';

const retriever = new JobDataRetrieverCloud({
  jobUrl: 'https://jobs.example.com/senior-developer',
  lightpandaToken: 'votre-token-ici',
  timeout: 30000
});

const result = await retriever.retrieve();
console.log(JSON.stringify(result, null, 2));
```

## Format de sortie

Le retriever produit exactement un objet JSON correspondant à cette structure :

```json
{
  "job": {
    "source_url": "https://jobs.lever.co/company/123",
    "title": "Senior Software Engineer",
    "role_seniority": "senior",
    "department_function": "Engineering",
    "contract_type": "full-time",
    "work_model": "hybrid",
    "location": {
      "city": "San Francisco",
      "region": "CA", 
      "country": "US",
      "remote_policy": "hybrid"
    },
    "salary": {
      "min": 120000,
      "max": 180000,
      "currency": "USD",
      "period": "year"
    },
    "required_experience": {
      "min_years": 5,
      "max_years": 8
    },
    "required_education": "Bachelor's degree in Computer Science",
    "languages": ["English"],
    "hard_skills": ["JavaScript", "Python", "React", "Node.js"],
    "soft_skills": ["Leadership", "Communication"],
    "tech_stack": ["AWS", "Docker", "PostgreSQL"],
    "responsibilities": [
      "Lead development of web applications",
      "Mentor junior developers"
    ],
    "nice_to_have": ["GraphQL experience", "Machine learning knowledge"],
    "visa_sponsorship": true,
    "relocation": false,
    "posting_date": "2025-09-01T00:00:00.000Z",
    "application_deadline": "2025-10-01T00:00:00.000Z",
    "description_text": "We are looking for...",
    "raw_schema_org": { "@type": "JobPosting", ... },
    "detected_duplicates": []
  },
  "company": {
    "name": "TechCorp Inc",
    "aka": ["TechCorp", "TC"],
    "website": "https://techcorp.com",
    "linkedin_url": "https://linkedin.com/company/techcorp",
    "wikipedia_url": "https://en.wikipedia.org/wiki/TechCorp",
    "industry": "Technology",
    "company_type": "Private",
    "founded_year": 2010,
    "size_employees": {
      "min": 500,
      "max": 1000
    },
    "hq_location": {
      "city": "San Francisco",
      "region": "CA",
      "country": "US"
    },
    "locations": [
      {
        "city": "New York",
        "region": "NY", 
        "country": "US"
      }
    ],
    "work_culture": {
      "values": ["Innovation", "Integrity", "Excellence"],
      "benefits": ["Health insurance", "401k", "Remote work"],
      "remote_policy": "hybrid"
    },
    "funding": {
      "status": "Series C",
      "latest_round": "50M",
      "investors": ["Sequoia Capital", "Andreessen Horowitz"]
    },
    "public_ticker": "",
    "about_summary": "TechCorp is a leading technology company...",
    "data_sources": [
      "https://techcorp.com",
      "https://techcorp.com/about",
      "https://en.wikipedia.org/wiki/TechCorp"
    ]
  },
  "metadata": {
    "scraped_at": "2025-09-27T16:30:00.000Z",
    "agent": "lightpanda-cloud+cdp",
    "notes": []
  }
}
```

## Stratégie d'extraction

### 1. Extraction des données d'emploi
- **Primaire** : JSON-LD `<script type="application/ld+json">` avec `@type: "JobPosting"`
- **Fallback** : Sélecteurs DOM pour titre, description, localisation, salaire, etc.
- **Enrichissement** : Analyse heuristique pour l'ancienneté, le mode de travail, les compétences

### 2. Découverte d'entreprise
- Extraction depuis les données `hiringOrganization` dans schema.org
- Recherche de liens et noms d'entreprise sur les pages d'emploi
- Résolution des sites web officiels d'entreprise

### 3. Enrichissement d'entreprise
- **Site officiel** : Page d'accueil + pages `/about`, `/company`, `/careers`
- **Wikipedia** : Seulement si une page exacte et crédible existe
- **LinkedIn** : Seulement pages publiques non authentifiées (conformité ToS)
- **Sources de données** : Enregistre chaque source visitée pour la transparence

### 4. Normalisation
- **Pays** : Codes pays ISO-3166 (ex: "USA" → "US")
- **Devises** : Codes devises ISO-4217 (ex: "$" → "USD")
- **Compétences** : Déduplication, capitalisation appropriée (ex: "javascript" → "JavaScript")
- **Tableaux** : Suppression des doublons, limites raisonnables
- **Dates** : Validation du format ISO

## Tests

### Tests de validation

```bash
# Exécuter les tests de validation (nécessite LIGHTPANDA_TOKEN)
npm run smoke-test-cloud

# Exécuter seulement le test de validation de schéma de base
npm run smoke-test-cloud  # (sans LIGHTPANDA_TOKEN défini)
```

### Test manuel

```bash
# Tester avec une vraie offre d'emploi
export LIGHTPANDA_TOKEN="votre-token"
export JOB_URL="https://jobs.lever.co/example/senior-engineer"
npm run retriever-cloud:dev
```

## Performance & limites

- **Timeout** : 30 secondes par défaut (configurable)
- **Limite de compétences** : 30 par catégorie pour éviter la surcharge
- **Limites de texte** : 1000 caractères pour les descriptions
- **Requêtes concurrentes** : Séquentiel pour respecter les limites de taux
- **Gestion des cookies** : Détection automatique des bannières de cookies courantes

## Conformité & éthique

- **Robots.txt** : Respecte robots.txt si possible
- **Limitation de taux** : Crawling poli avec délais entre requêtes  
- **Conformité ToS** : Scrape seulement du contenu publiquement accessible
- **LinkedIn** : Accède seulement aux pages d'entreprise publiques non authentifiées
- **User-Agent** : S'identifie correctement dans les requêtes

## Architecture

```
src/retriever/
├── indexCloud.ts         # Orchestrateur principal et CLI pour Lightpanda Cloud
├── lightpandaCloud.ts    # Client API Lightpanda Cloud
├── extractJobCloud.ts    # Extraction de données d'emploi (JSON-LD + DOM)
├── enrichCompanyCloud.ts # Enrichissement de données d'entreprise
├── normalize.ts          # Normalisation et validation des données
└── schema.ts             # Schémas Zod et types TypeScript

scripts/
├── smoke-cloud.ts        # Tests de validation pour Lightpanda Cloud
└── example-usage-cloud.sh # Script d'exemple d'utilisation
```

## Dépannage

### Problèmes courants

1. **"LIGHTPANDA_API_KEY environment variable is required"**
   ```bash
   # Obtenez votre clé API sur https://lightpanda.io/#cloud-offer
   export LIGHTPANDA_API_KEY="votre-cle-api-ici"
   ```

2. **Timeouts d'API**
   ```bash
   # Augmentez le timeout
   export TIMEOUT="60000"  # 60 secondes
   ```

3. **Résultats vides**
   - Vérifiez si l'URL de l'offre d'emploi est accessible
   - Certains sites peuvent bloquer les navigateurs automatisés
   - Essayez avec des URLs différentes de boards d'emploi

4. **Données d'entreprise manquantes**
   - L'enrichissement d'entreprise est en best-effort
   - Certaines entreprises peuvent ne pas avoir de pages Wikipedia
   - Le scraping LinkedIn ne fonctionne que pour les pages publiques

5. **Limite d'API atteinte**
   - Vérifiez votre usage sur le dashboard Lightpanda
   - Considérez upgrader votre plan si nécessaire

### Mode debug

```bash
# Activer les logs verbeux (si implémenté)
DEBUG=1 npm run retriever-cloud:dev
```

## Avantages de Lightpanda Cloud

- **Pas de setup** : Aucune infrastructure à gérer
- **Scalabilité** : Gestion automatique de la charge
- **Maintenance** : Navigateurs toujours à jour
- **Fiabilité** : Infrastructure professionnelle
- **Support** : Support technique disponible

## Comparaison des coûts

- **Tier gratuit** : Idéal pour les tests et petits projets
- **Plans payants** : Plus de requêtes, support prioritaire
- **Auto-hébergé** : Coûts d'infrastructure mais contrôle total

## Contributing

1. Fork le repository
2. Créez une branche feature : `git checkout -b feature/improvement`
3. Effectuez les changements et ajoutez des tests
4. Exécutez les tests : `npm run smoke-test-cloud`
5. Soumettez une pull request

## Licence

[Ajoutez votre licence ici]
