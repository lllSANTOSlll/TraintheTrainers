# 📋 Train the Trainers — Système de Gestion de Formation

> Plateforme web interne développée pour **Distech Controls** afin de centraliser et automatiser la gestion de la formation des employés, le suivi des compétences et la planification hebdomadaire.

---

## 🎯 Objectif du projet

Ce système remplace les fichiers Excel dispersés et les processus manuels par une application web centralisée, accessible depuis n'importe quel appareil (ordinateur, tablette, téléphone mobile). Il permet aux superviseurs et administrateurs de :

- Suivre en temps réel les compétences de chaque employé
- Planifier les quarts de travail en tenant compte des stations maîtrisées
- Gérer les sessions de formation et certifier les formateurs
- Suivre la situation hebdomadaire de chaque employé (Stable / À surveiller / À risque)
- Visualiser congés, absences et formations sur un calendrier centralisé

---

## ✨ Fonctionnalités principales

### 👥 Gestion des employés
- Profil complet : photo, poste, quart de travail, département, statut
- Import en masse via fichier CSV
- Matrice de compétences par station (Opérations) ou colonnes dynamiques (autres départements)
- Historique de formation par employé

### 🗓️ Planification hebdomadaire
- Grille semaine par semaine (Lun – Dim)
- Affectation des employés aux stations selon leurs compétences maîtrisées
- Filtre par quart (Jour / Soir / Nuit)
- Planification automatique suggérée
- Gestion des congés intégrée (congés verrouillés dans la grille)

### 📊 Matrice de formation
- Vue globale des compétences de tous les employés par station
- Statuts : Oui / En formation / En révision
- Version statique (Opérations) et version dynamique (colonnes configurables par département)
- Affichage en temps réel sur écran dédié (mode kiosque)

### 🎓 Sessions de formation
- Suivi des sessions : En cours / Terminée / En retard
- Calendrier mensuel avec indicateurs visuels
- Lien automatique formateur ↔ employé

### 📋 Suivi Employés
- Grille hebdomadaire Mon–Ven par employé
- 3 statuts : ✅ **Stable** · ⚠️ **À surveiller** · 🔴 **À risque**
- Commentaires obligatoires pour les situations préoccupantes
- Sauvegarde instantanée (sans rechargement de page)
- Historique consultable semaine par semaine

### 🏖️ Gestion des congés
- Calendrier mensuel des absences par département
- Types : Congé, Maladie, Férié, Formation, Autre
- Indicateurs visuels dans la planification et le tableau de bord

### 📈 Tableau de bord
- Statistiques en temps réel : formateurs certifiés, en formation, sessions actives
- Calendrier mensuel avec congés et formations en cours
- Vue d'ensemble du processus "Former les Formateurs"

### 🔐 Gestion des accès
- 3 niveaux de rôles : **Administrateur** · **Superviseur** · **Formateur**
- Isolation par département (chaque département voit uniquement ses données)
- Permissions granulaires configurables

### 🌍 Multilingue
- Interface disponible en **Français**, **Anglais** et **Espagnol**

---

## 🛠️ Technologies utilisées

| Couche | Technologie |
|--------|-------------|
| Serveur | Node.js + Express.js |
| Vues | EJS (Embedded JavaScript Templates) |
| Base de données | SQLite3 (migration PostgreSQL possible) |
| Interface | Bootstrap 5 + Bootstrap Icons |
| Typographie | Figtree (Google Fonts) |
| Déploiement | Render.com (cloud) |

---

## 📱 Compatibilité mobile

L'application est entièrement responsive :
- Menu hamburger sur mobile
- Tableaux adaptés (colonnes masquées, mise en page empilée)
- Calendriers optimisés pour petits écrans
- Boutons icône-only sur mobile pour économiser l'espace

---

## 🚀 Déploiement

| Environnement | URL |
|---------------|-----|
| **Production (cloud)** | https://trainthetrainers.onrender.com |
| **Local** | http://localhost:5000 |

### Démarrage local

```bash
# Installer les dépendances
npm install

# Lancer le serveur
node server.js
```

L'application démarre sur le port **5000** et crée automatiquement la base de données au premier lancement.

---

## 🏗️ Structure du projet

```
app/
├── config/           # Base de données & permissions
├── middleware/        # Authentification & rôles
├── routes/           # Logique serveur (employees, schedule, suivi, ...)
├── views/            # Pages EJS
│   ├── dashboard.ejs
│   ├── employees/    # Liste, détail, formulaire
│   ├── matrix/       # Matrice statique & dynamique
│   ├── schedule/     # Planification & congés
│   ├── suivi/        # Suivi hebdomadaire employés
│   ├── training/     # Sessions de formation
│   ├── trainers/     # Gestion des formateurs
│   └── partials/     # Header, footer
├── public/           # Images, CSS, JS statiques
└── server.js         # Point d'entrée
```

---

## 🔄 Processus "Former les Formateurs"

```
1. Identification  →  2. Formation  →  3. Planification
       ↑                                      ↓
6. Amélioration  ←  5. Certification  ←  4. Évaluation
```

Le système accompagne chaque étape de ce cycle, du repérage des candidats jusqu'à la certification et le suivi continu.

---

## 📌 Fonctionnalités à venir

- [ ] Authentification SSO Microsoft Azure AD
- [ ] Intégration tableau de bord DOMO
- [ ] Migration base de données PostgreSQL (persistance cloud)
- [ ] Notifications par courriel (absences, formations à échéance)
- [ ] Export PDF des rapports de compétences

---

## 👨‍💻 Développeur

Développé par **Helder Santos** — Distech Controls, département Production

---

*Application à usage interne — Distech Controls © 2025*
