# Job Data Retriever - Guide de choix d'implémentation

Ce projet propose **deux implémentations** du job data retriever, selon vos besoins et préférences :

## 🌩️ Lightpanda Cloud (Recommandé pour la plupart des cas)

**Fichiers principaux :**
- `src/retriever/indexCloud.ts`
- `src/retriever/lightpandaCloud.ts` 
- `src/retriever/extractJobCloud.ts`
- `src/retriever/enrichCompanyCloud.ts`

### ✅ Avantages
- **Setup rapide** : Aucune infrastructure à gérer
- **Scalabilité automatique** : Gestion de la charge par Lightpanda
- **Maintenance zéro** : Navigateurs toujours à jour
- **Support professionnel** : Équipe technique dédiée
- **Tier gratuit** : Idéal pour commencer et tester

### ❌ Inconvénients  
- **Coût** : Après le tier gratuit, facturation par requête
- **Dépendance externe** : Nécessite un service tiers
- **Moins de contrôle** : Configuration limitée vs auto-hébergé

### 🚀 Utilisation

```bash
# Configuration
export LIGHTPANDA_API_KEY="votre-cle-api"
export JOB_URL="https://jobs.lever.co/company/job-id"

# Exécution
npm run retriever-cloud:dev
```

**Obtenir votre clé API :** https://lightpanda.io/#cloud-offer

---

## 🐳 Lightpanda Browser (Auto-hébergé)

**Fichiers principaux :**
- `src/retriever/index.ts`
- `src/retriever/browser.ts`
- `src/retriever/extractJob.ts`
- `src/retriever/enrichCompany.ts`

### ✅ Avantages
- **Contrôle total** : Configuration personnalisée du navigateur
- **Coût prévisible** : Pas de facturation par requête
- **Offline** : Fonctionne sans dépendance externe
- **Customisation** : Modifications du comportement du navigateur

### ❌ Inconvénients
- **Setup complexe** : Docker et configuration WebSocket
- **Maintenance** : Mises à jour manuelles du navigateur
- **Scalabilité** : Gestion manuelle des ressources
- **Infrastructure** : Serveur requis pour la production

### 🚀 Utilisation

```bash
# Démarrer Lightpanda Browser
npm run lightpanda:up

# Configuration
export LIGHTPANDA_WS="ws://localhost:9222/devtools/browser"
export JOB_URL="https://jobs.lever.co/company/job-id"

# Exécution
npm run retriever:dev
```

---

## 🤔 Quel choix faire ?

### Choisissez **Lightpanda Cloud** si :
- ✅ Vous voulez commencer rapidement
- ✅ Vous préférez un service géré
- ✅ Vous avez un volume modéré de scraping
- ✅ Vous voulez éviter la gestion d'infrastructure
- ✅ Vous avez besoin de support technique

### Choisissez **Lightpanda Browser** si :
- ✅ Vous avez des besoins de customisation spécifiques
- ✅ Vous voulez un contrôle total sur l'infrastructure
- ✅ Vous avez un volume très élevé (coût/requête important)
- ✅ Vous travaillez dans un environnement offline/sécurisé
- ✅ Vous avez des compétences DevOps pour la maintenance

---

## 📊 Comparaison détaillée

| Critère | Lightpanda Cloud | Lightpanda Browser |
|---------|------------------|-------------------|
| **Setup** | 🟢 Immédiat | 🟡 Docker requis |
| **Maintenance** | 🟢 Aucune | 🔴 Mises à jour manuelles |
| **Coût initial** | 🟢 Gratuit | 🟢 Gratuit |
| **Coût à l'échelle** | 🟡 Par requête | 🟢 Infrastructure fixe |
| **Contrôle** | 🟡 Limité | 🟢 Total |
| **Scalabilité** | 🟢 Automatique | 🟡 Manuelle |
| **Support** | 🟢 Professionnel | 🔴 Communauté |
| **Offline** | 🔴 Non | 🟢 Oui |

---

## 🛠️ Scripts disponibles

### Lightpanda Cloud
```bash
npm run retriever-cloud:dev         # Développement
npm run retriever-cloud:build       # Construction
npm run retriever-cloud:start       # Production
npm run smoke-test-cloud           # Tests
./scripts/example-usage-cloud.sh   # Exemples
```

### Lightpanda Browser  
```bash
npm run retriever:dev               # Développement
npm run retriever:build             # Construction  
npm run retriever:start             # Production
npm run smoke-test                  # Tests
./scripts/example-usage.sh          # Exemples
npm run lightpanda:up               # Démarrer navigateur
npm run lightpanda:down             # Arrêter navigateur
```

---

## 🚀 Démarrage rapide

### Pour Lightpanda Cloud (le plus simple)

1. **Obtenez votre clé API**
   ```bash
   # Visitez https://lightpanda.io/#cloud-offer
   # Inscrivez-vous et récupérez votre clé API
   ```

2. **Configurez l'environnement**
   ```bash
   export LIGHTPANDA_API_KEY="votre-cle-api"
   ```

3. **Testez avec un job**
   ```bash
   JOB_URL="https://jobs.lever.co/stripe/software-engineer" npm run retriever-cloud:dev
   ```

### Pour Lightpanda Browser

1. **Démarrez le navigateur**
   ```bash
   npm run lightpanda:up
   ```

2. **Configurez l'environnement**  
   ```bash
   export LIGHTPANDA_WS="ws://localhost:9222/devtools/browser"
   ```

3. **Testez avec un job**
   ```bash
   JOB_URL="https://jobs.lever.co/stripe/software-engineer" npm run retriever:dev
   ```

---

## 📚 Documentation

- **Lightpanda Cloud** : `README-retriever-cloud.md`
- **Lightpanda Browser** : `README-retriever.md`

## 🤝 Support

- **Issues** : Créez une issue GitHub
- **Lightpanda Cloud** : Support officiel Lightpanda
- **Lightpanda Browser** : Communauté + documentation Docker

---

**Recommandation :** Commencez avec **Lightpanda Cloud** pour la simplicité, puis migrez vers **Lightpanda Browser** si vous avez des besoins spécifiques de contrôle ou de volume.
