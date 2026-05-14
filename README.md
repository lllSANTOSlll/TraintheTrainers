<<<<<<< HEAD
# Former les Formateurs - Application de Gestion

Application web complète pour gérer le processus de formation des formateurs avec authentification, gestion des rôles et intégration SharePoint.

## 📋 Fonctionnalités

### ✅ Fonctionnalités Actuelles

- **Authentification sécurisée** avec sessions
  - Login/Logout
  - Gestion de session avec express-session
  - Mots de passe hashés avec bcrypt

- **Gestion des utilisateurs (Admin uniquement)**
  - Créer, modifier, supprimer des utilisateurs
  - Attribuer des rôles (admin/user)
  - Changer les mots de passe

- **Gestion des formateurs**
  - Liste complète des formateurs
  - Ajouter/Modifier/Supprimer des formateurs
  - Suivi du statut de validation
  - Historique des certifications

- **Sessions de formation**
  - Créer des sessions de formation
  - Assigner des formateurs
  - Suivre la progression
  - Checklist de formation intégrée

- **Évaluations**
  - Grille d'évaluation standardisée
  - Critères multiples (technique, pédagogie, communication, etc.)
  - Historique des évaluations par formateur

- **Intégration SharePoint**
  - Export vers Excel (.xlsx)
  - Export vers SharePoint Lists (via Microsoft Graph API)
  - Import depuis SharePoint Lists
  - Synchronisation bidirectionnelle

- **Tableau de bord**
  - Statistiques en temps réel
  - Actions rapides
  - Vue d'ensemble du processus

## 🚀 Installation

### Prérequis

- Node.js (v14 ou supérieur)
- npm (inclus avec Node.js)

### Étapes d'installation

1. **Naviguer vers le dossier du projet**
```bash
cd trainer-management
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos informations:
```env
PORT=3001
SESSION_SECRET=votre-cle-secrete-changez-moi

# Configuration SharePoint (optionnel)
SHAREPOINT_CLIENT_ID=votre-client-id
SHAREPOINT_CLIENT_SECRET=votre-client-secret
SHAREPOINT_TENANT_ID=votre-tenant-id
SHAREPOINT_SITE_URL=https://votrecompanie.sharepoint.com/sites/votresite
SHAREPOINT_LIST_NAME=FormateursQualifies
```

4. **Initialiser la base de données**
```bash
npm run init-db
```

Cela créera:
- La base de données SQLite
- Les tables nécessaires
- Un compte admin par défaut (admin/admin123)
- Un compte utilisateur par défaut (user/user123)

5. **Démarrer l'application**
```bash
npm start
```

Ou en mode développement (avec rechargement automatique):
```bash
npm run dev
```

6. **Accéder à l'application**
Ouvrez votre navigateur et allez à: **http://localhost:3001**

## 👤 Comptes par défaut

- **Administrateur**
  - Username: `admin`
  - Password: `admin123`
  - Accès complet à toutes les fonctionnalités

- **Utilisateur standard**
  - Username: `user`
  - Password: `user123`
  - Accès lecture/écriture (pas d'accès admin)

⚠️ **Important**: Changez ces mots de passe en production!

## 🔧 Configuration SharePoint

### Créer une App Azure AD

1. Allez sur le [Portail Azure](https://portal.azure.com)
2. Naviguez vers "Azure Active Directory" > "App registrations"
3. Cliquez "New registration"
4. Configurez:
   - Name: "Former les Formateurs App"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Laissez vide pour l'instant
5. Cliquez "Register"

### Configurer les permissions

1. Dans votre app, allez à "API permissions"
2. Ajoutez les permissions suivantes:
   - Microsoft Graph:
     - `Sites.ReadWrite.All` (Application permission)
     - `Sites.Manage.All` (Application permission)
3. Cliquez "Grant admin consent"

### Obtenir les credentials

1. Dans "Overview", copiez:
   - Application (client) ID → `SHAREPOINT_CLIENT_ID`
   - Directory (tenant) ID → `SHAREPOINT_TENANT_ID`

2. Dans "Certificates & secrets":
   - Créez un nouveau client secret
   - Copiez la valeur → `SHAREPOINT_CLIENT_SECRET`

### Créer la liste SharePoint

1. Créez une liste SharePoint nommée "FormateursQualifies"
2. Ajoutez les colonnes suivantes:
   - Title (Texte) - Nom du formateur
   - PosteActuel (Texte)
   - Departement (Texte)
   - DomaineExpertise (Texte)
   - StatutValidation (Choix: Validé, Non validé)
   - DateFormation (Date)
   - DateCertification (Date)
   - Superviseur (Texte)
   - Commentaires (Multiligne)

## 📁 Structure du projet

```
trainer-management/
├── config/
│   └── database.js           # Configuration base de données
├── middleware/
│   └── auth.js                # Middleware d'authentification
├── routes/
│   ├── auth.js                # Routes authentification
│   ├── trainers.js            # Routes formateurs
│   ├── evaluations.js         # Routes évaluations
│   ├── training.js            # Routes sessions de formation
│   ├── admin.js               # Routes administration
│   └── sharepoint.js          # Routes SharePoint
├── scripts/
│   └── initDb.js              # Script initialisation DB
├── views/
│   ├── partials/
│   │   ├── header.ejs         # En-tête commun
│   │   └── footer.ejs         # Pied de page commun
│   ├── trainers/
│   │   ├── list.ejs           # Liste formateurs
│   │   ├── form.ejs           # Formulaire formateur
│   │   └── detail.ejs         # Détails formateur
│   ├── admin/
│   │   ├── users.ejs          # Gestion utilisateurs
│   │   └── user-form.ejs      # Formulaire utilisateur
│   ├── sharepoint/
│   │   └── sync.ejs           # Page synchronisation
│   ├── dashboard.ejs          # Tableau de bord
│   ├── login.ejs              # Page de connexion
│   └── error.ejs              # Page d'erreur
├── database/
│   └── trainers.db            # Base de données SQLite
├── .env                       # Variables d'environnement
├── .env.example               # Exemple de configuration
├── server.js                  # Point d'entrée de l'application
└── package.json               # Dépendances npm
```

## 🗄️ Base de données

L'application utilise SQLite avec les tables suivantes:

- **users**: Utilisateurs de l'application
- **trainers**: Formateurs potentiels et certifiés
- **evaluations**: Évaluations des formateurs
- **training_sessions**: Sessions de formation
- **checklist_items**: Éléments de la checklist de formation

## 🔒 Sécurité

- Mots de passe hashés avec bcryptjs (10 rounds)
- Sessions sécurisées avec express-session
- Protection CSRF avec method-override
- Validation des rôles pour les routes admin
- Variables d'environnement pour les secrets

## 📊 Export/Import

### Export Excel
- Accessible depuis le tableau de bord
- Génère un fichier .xlsx avec tous les formateurs
- Formatage professionnel avec en-têtes colorés

### SharePoint
- Export bidirectionnel
- Synchronisation automatique possible
- Utilise Microsoft Graph API

## 🚧 Développement futur

- [ ] Notification par email pour les nouvelles certifications
- [ ] Génération automatique de certificats PDF
- [ ] Tableau de bord avec graphiques (KPIs)
- [ ] Historique complet des modifications
- [ ] Rapports avancés et statistiques
- [ ] API REST pour intégrations externes
- [ ] Application mobile (React Native)

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier que Node.js est installé
node --version

# Réinstaller les dépendances
rm -rf node_modules
npm install
```

### Erreur de base de données
```bash
# Réinitialiser la base de données
rm database/trainers.db
npm run init-db
```

### Erreur SharePoint
- Vérifiez que les credentials dans `.env` sont corrects
- Vérifiez les permissions de l'app Azure AD
- Vérifiez le nom de la liste SharePoint

## 📝 Licence

Application interne - Tous droits réservés

## 👨‍💻 Support

Pour toute question ou problème, contactez l'équipe Amélioration Continue.
=======
# NODE.js
>>>>>>> 381edbb1c5dae3f6805f03858ef4b764b8125c2a
