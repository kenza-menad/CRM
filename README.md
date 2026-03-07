<!-- # 🟢 FormaPro CRM

> CRM métier pour agence de formation — gestion des contacts, leads, deals, tâches et pipeline commercial.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

---

## 📋 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| Base de données | PostgreSQL (Neon) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Emails | Brevo (SendinBlue) |
| Déploiement | Docker |

---

## 🗂️ Fonctionnalités

- ✅ Authentification (signup, login, reset password par code 6 chiffres)
- ✅ Gestion des **Contacts** avec historique et liaison entreprise
- ✅ Gestion des **Entreprises**
- ✅ Gestion des **Leads** (nouveau → en cours → converti / perdu)
- ✅ Gestion des **Deals** avec pipeline Kanban
- ✅ Gestion des **Tâches** avec priorité urgente, calendrier et filtres
- ✅ **Dashboard** avec KPIs, CA mensuel, entonnoir de conversion, activité récente
- ✅ Gestion des **Utilisateurs** (admin / commercial / user)
- ✅ Emails automatiques (bienvenue, nouveau lead, tâche en retard, deal gagné)

---

## 🗄️ Diagramme de classes

> 📌 Généré automatiquement à chaque push via GitHub Actions

![Diagramme de classes](doc/diagram_model.png)

---

## 🗃️ Schéma base de données

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR NOT NULL,
  last_name  VARCHAR NOT NULL,
  email      VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role       VARCHAR DEFAULT 'user',
  phone      VARCHAR,
  job_title  VARCHAR,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Password resets
CREATE TABLE password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR NOT NULL,
  code       VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Companies
CREATE TABLE companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR NOT NULL,
  website        VARCHAR,
  city           VARCHAR,
  sector         VARCHAR,
  phone          VARCHAR,
  size           VARCHAR,
  annual_revenue NUMERIC,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Contacts
CREATE TABLE contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   VARCHAR NOT NULL,
  last_name    VARCHAR NOT NULL,
  email        VARCHAR NOT NULL,
  phone        VARCHAR,
  job_title    VARCHAR,
  city         VARCHAR,
  linkedin_url VARCHAR,
  history      TEXT,
  company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Leads
CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR NOT NULL,
  status      VARCHAR DEFAULT 'nouveau',
  source      VARCHAR,
  value_eur   NUMERIC,
  contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Deals
CREATE TABLE deals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR NOT NULL,
  status      VARCHAR DEFAULT 'qualification',
  amount      NUMERIC DEFAULT 0,
  contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR NOT NULL,
  due_at      TIMESTAMPTZ,
  done        BOOLEAN DEFAULT false,
  priority    VARCHAR(10) DEFAULT 'normal',
  contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 🚀 Lancer le projet

```bash
# Cloner le repo
git clone https://github.com/ton-user/formaero-crm.git
cd formaero-crm

# Variables d'environnement
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET, BREVO_API_KEY

# Docker
docker compose up --build
```

---

## 🔐 Variables d'environnement

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=your_jwt_secret
BREVO_API_KEY=your_brevo_key
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 📁 Structure du projet

```
/
├── backend/
│   ├── server.js        # API Express principale
│   ├── deals.js         # Router deals
│   ├── brevo.js         # Envoi d'emails
│   └── .env
├── frontend/
│   └── app/
│       ├── dashboard/page.tsx
│       ├── contacts/page.tsx
│       ├── entreprises/page.tsx
│       ├── leads/page.tsx
│       ├── deals/page.tsx
│       ├── pipeline/page.tsx
│       ├── tasks/page.tsx
│       └── users/page.tsx
├── doc/
│   └── diagram_model.png   # Généré automatiquement
├── .github/
│   └── workflows/
│       └── generate-uml.yml
└── docker-compose.yml
```

---

## 👤 Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `admin` | Accès complet + gestion utilisateurs |
| `commercial` | Contacts, leads, deals, tâches |
| `user` | Lecture + ses propres tâches | -->


# 🟢 FormaPro CRM

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

**Application CRM web Full Stack SaaS pour une agence de formation en Marketing Digital**

*Gérez vos contacts, leads, deals, tâches et communications depuis une interface moderne et intuitive*

</div>

---

## 📋 Table des matières

1. [Présentation du projet](#-présentation-du-projet)
2. [Analyse des besoins](#-analyse-des-besoins)
3. [Stack technique](#-stack-technique)
4. [Architecture](#-architecture)
5. [Base de données — MCD Merise](#-base-de-données--mcd-merise)
6. [Diagramme Use Case — UML](#-diagramme-use-case--uml)
7. [Fonctionnalités détaillées](#-fonctionnalités-détaillées)
8. [Pipeline de ventes & Workflow](#-pipeline-de-ventes--workflow)
9. [Emails automatiques Brevo](#-emails-automatiques-brevo)
10. [Installation locale](#-installation-locale)
11. [Déploiement CI/CD](#-déploiement-cicd)
12. [Variables d'environnement](#-variables-denvironnement)
13. [Structure du projet](#-structure-du-projet)
14. [Sécurité](#-sécurité)
15. [Bilan du projet](#-bilan-du-projet)

---

##  Présentation du projet

### Contexte

FormaPro est une agence spécialisée dans la formation en **Marketing Digital**. Elle propose des formations sur des thématiques telles que le SEO, Google Ads, les réseaux sociaux, l'analytics et la stratégie digitale.


---

##  Analyse des besoins

### 1.1 Acteurs du système

| Acteur | Rôle | Niveau d'accès |
|--------|------|----------------|
| **Administrateur** | Gère l'ensemble du CRM et de l'équipe | Accès complet à toutes les fonctionnalités |
| **Commercial** | Suit ses leads, deals, contacts et tâches | Accès à son périmètre commercial |
| **Utilisateur** | Accès consultatif | Lecture + tâches personnelles uniquement |
| **Système Brevo** | Service SaaS externe | Envoi et suivi des emails |

### 1.2 Besoins fonctionnels

| ID | Besoin | Priorité |
|----|--------|----------|
| BF01 | Authentification sécurisée (login, inscription, reset password) | Haute |
| BF02 | Gestion CRUD des contacts avec fiches détaillées | Haute |
| BF03 | Gestion CRUD des entreprises partenaires | Haute |
| BF04 | Suivi des leads avec statuts et sources | Haute |
| BF05 | Pipeline de ventes visuel (Kanban + Liste) | Haute |
| BF06 | Gestion des tâches avec calendrier et priorités | Haute |
| BF07 | Envoi d'emails automatiques via Brevo (9 types) | Haute |
| BF08 | Envoi d'emails manuels depuis les fiches contact | Haute |
| BF09 | Templates d'emails personnalisables avec variables | Moyenne |
| BF10 | Tableau de bord analytique avec KPI et graphiques | Haute |
| BF11 | Historique complet des communications | Moyenne |
| BF12 | Gestion des rôles et utilisateurs | Haute |
| BF13 | Filtres par période sur le dashboard | Moyenne |
| BF14 | Export CSV des entreprises | Basse |

### 1.3 Besoins non fonctionnels

| ID | Besoin | Critère |
|----|--------|---------|
| BNF01 | **Performance** | Temps de réponse API < 500ms |
| BNF02 | **Sécurité** | JWT + bcrypt, aucune donnée sensible en clair |
| BNF03 | **Disponibilité** | Hébergement cloud Vercel (99.9% uptime) |
| BNF04 | **Responsive** | Interface utilisable sur mobile et desktop |
| BNF05 | **Maintenabilité** | Architecture modulaire, code documenté |
| BNF06 | **Déploiement** | CI/CD automatique GitHub → Vercel |
| BNF07 | **Scalabilité** | PostgreSQL cloud Neon, extensible |

---

##  Stack technique

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Next.js** | 14 | Framework React avec SSR et routing |
| **React** | 18 | Bibliothèque UI, gestion de l'état |
| **TypeScript** | 5 | Typage statique pour la robustesse |
| **Tailwind CSS** | 3 | Framework CSS utility-first, design responsive |

### Backend

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Node.js** | 18+ | Runtime JavaScript côté serveur |
| **Express.js** | 4 | Framework API REST |
| **JWT** | — | Authentification stateless sécurisée |
| **bcrypt** | — | Hashage des mots de passe |

### Base de données & Services

| Service | Type | Rôle |
|---------|------|------|
| **Neon** | SaaS (PostgreSQL cloud) | Base de données relationnelle managée |
| **Brevo** | SaaS (Email API) | Envoi d'emails transactionnels et marketing |
| **Vercel** | SaaS (Hébergement) | Déploiement frontend + backend serverless |
| **Docker** | Containerisation | Environnement de développement local |
| **GitHub** | Versioning + CI/CD | Gestion du code source et déploiement automatique |

---

##  Architecture

### Vue globale

```
┌──────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                               │
│                  (Navigateur web / Mobile)                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  FRONTEND — Next.js 14                           │
│              Hébergé sur Vercel (CDN mondial)                    │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Dashboard │ │Contacts  │ │Pipeline  │ │Emails / Templates│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Leads   │ │Entreprises│ │  Tâches  │ │   Utilisateurs   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP + Bearer JWT
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  BACKEND — Node.js + Express                     │
│              Hébergé sur Vercel (Serverless Functions)           │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Middleware Auth │    │ Middleware Admin │                     │
│  │  requireAuth()  │    │ requireAdmin()  │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                  │
│  Routes : /auth /contacts /companies /leads /deals              │
│           /tasks /emails /users /dashboard /templates           │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ SQL (pg)                     │ API REST (HTTPS)
           ▼                             ▼
┌─────────────────────┐      ┌──────────────────────────┐
│  PostgreSQL         │      │  Brevo Email API         │
│  via Neon           │      │                          │
│  (Cloud managé)     │      │  POST /v3/smtp/email     │
│                     │      │  Logs → emails_log table │
│  - Sauvegardes auto │      │                          │
│  - SSL obligatoire  │      └──────────────────────────┘
└─────────────────────┘
```

### Flux de données — Exemple envoi d'email

```
1. Commercial clique "Envoyer un email" sur fiche contact
2. Frontend → POST /emails/send { to, subject, body, contactId }
3. Middleware requireAuth vérifie le JWT
4. Backend appelle brevo.js → sendEmail()
5. brevo.js → API Brevo (POST /v3/smtp/email)
6. Dans le bloc finally → logEmail() enregistre dans emails_log
   (status "sent" ou "failed" selon la réponse Brevo)
7. Backend retourne { success: true }
8. Frontend affiche toast vert "Email envoyé avec succès !"
9. Panel Emails du contact se recharge automatiquement
```

---

##  Base de données — MCD Merise

### Schéma des entités et relations

```
>  Généré automatiquement à chaque push via GitHub Actions

![Diagramme de classes](doc/diagram_model.png)
```
### Détail des tables principales

#### Table `users`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | UUID | PK | Identifiant unique |
| `first_name` | TEXT | NOT NULL | Prénom |
| `last_name` | TEXT | NOT NULL | Nom de famille |
| `email` | TEXT | NOT NULL, UNIQUE | Adresse email |
| `password_hash` | TEXT | NOT NULL | Mot de passe hashé bcrypt |
| `role` | TEXT | DEFAULT 'user' | admin / commercial / user |
| `is_active` | BOOLEAN | DEFAULT true | Compte actif ou non |
| `phone` | TEXT | — | Numéro de téléphone |
| `job_title` | TEXT | — | Poste / fonction |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Date de création |

#### Table `contacts`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | UUID | PK | Identifiant unique |
| `first_name` | TEXT | NOT NULL | Prénom |
| `last_name` | TEXT | NOT NULL | Nom |
| `email` | TEXT | — | Email du contact |
| `phone` | TEXT | — | Téléphone |
| `job_title` | TEXT | — | Poste occupé |
| `city` | TEXT | — | Ville |
| `linkedin_url` | TEXT | — | Profil LinkedIn |
| `history` | TEXT | — | Notes internes |
| `company_id` | UUID | FK → companies | Entreprise associée |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Date de création |

#### Table `deals`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | UUID | PK | Identifiant unique |
| `title` | TEXT | NOT NULL | Nom du deal |
| `amount` | NUMERIC | — | Montant en euros |
| `status` | TEXT | DEFAULT 'prospect' | prospect / qualification / proposition / negociation / gagne / perdu |
| `probability` | INTEGER | DEFAULT 10 | Probabilité de closing (%) |
| `expected_close_date` | DATE | — | Date de clôture prévue |
| `notes` | TEXT | — | Notes sur le deal |
| `contact_id` | UUID | FK → contacts | Contact associé |
| `company_id` | UUID | FK → companies | Entreprise associée |
| `assigned_to` | UUID | FK → users | Commercial responsable |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Date de création |

#### Table `emails_log`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `to_email` | TEXT | Adresse destinataire |
| `subject` | TEXT | Sujet de l'email |
| `type` | TEXT | welcome / deal_won / new_lead / other... |
| `status` | TEXT | sent / failed |
| `contact_id` | UUID FK | Contact concerné |
| `user_id` | UUID FK | Utilisateur expéditeur |
| `sent_at` | TIMESTAMPTZ | Date d'envoi |
| `opened_at` | TIMESTAMPTZ | Date d'ouverture (Brevo webhook) |
| `clicked_at` | TIMESTAMPTZ | Date de clic (Brevo webhook) |

### Relations entre entités

| Relation | Cardinalité | Description |
|----------|-------------|-------------|
| `contacts → companies` | N:1 | Un contact appartient à une entreprise |
| `leads → contacts` | N:1 | Un lead est associé à un contact |
| `leads → users` | N:1 | Un lead est assigné à un commercial |
| `deals → contacts` | N:1 | Un deal est associé à un contact |
| `deals → companies` | N:1 | Un deal est associé à une entreprise |
| `deals → users` | N:1 | Un deal est géré par un commercial |
| `tasks → contacts` | N:1 | Une tâche peut concerner un contact |
| `tasks → leads` | N:1 | Une tâche peut concerner un lead |
| `tasks → users` | N:1 | Une tâche est assignée à un utilisateur |
| `emails_log → contacts` | N:1 | Un email est lié à un contact |
| `emails_log → users` | N:1 | Un email est envoyé par un utilisateur |

---

##  Diagramme Use Case — UML

### Acteurs

```
Administrateur ──── Hérite de tous les droits
Commercial     ──── Périmètre limité à son activité commerciale
Utilisateur    ──── Accès lecture + tâches personnelles
Système Brevo  ──── Acteur externe, envoi d'emails
```

### Module Authentification

| Cas d'utilisation | Acteur(s) | Pré-conditions | Post-conditions |
|-------------------|-----------|----------------|-----------------|
| Se connecter | Tous | Compte existant et actif | Token JWT généré, accès au CRM |
| Créer un compte | Tous | Email non existant | Compte créé, email de bienvenue envoyé |
| Réinitialiser le MDP | Tous | Email existant | Code 6 chiffres envoyé, MDP modifiable |
| Se déconnecter | Tous | Être connecté | Token supprimé, redirection login |
| Modifier son profil | Tous | Être connecté | Informations mises à jour |

### Module Contacts & Entreprises

| Cas d'utilisation | Acteur(s) | Description |
|-------------------|-----------|-------------|
| Créer un contact | Admin, Commercial | Formulaire complet, association entreprise |
| Modifier un contact | Admin, Commercial | Édition inline de tous les champs |
| Supprimer un contact | Admin | Suppression avec cascade sur deals/tasks |
| Rechercher / filtrer | Tous | Par nom, email, ville, entreprise |
| Envoyer un email | Admin, Commercial | Modal depuis la fiche, log automatique |
| Ajouter une note | Admin, Commercial | Note interne horodatée |
| Créer une entreprise | Admin, Commercial | Fiche avec secteur, CA, phase de vie |
| Voir la fiche entreprise | Tous | Contacts + deals + résumé financier |
| Exporter en CSV | Admin | Export de la liste des entreprises |

### Module Leads & Pipeline

| Cas d'utilisation | Acteur(s) | Description |
|-------------------|-----------|-------------|
| Créer un lead | Admin, Commercial | Nom, source, valeur, contact, entreprise |
| Modifier le statut | Admin, Commercial | Nouveau → En cours → Converti / Perdu |
| Assigner un lead | Admin | Attribution à un commercial |
| Visualiser le Kanban leads | Tous | 4 colonnes par statut |
| Créer un deal | Admin, Commercial | Dans le pipeline de ventes |
| Modifier l'étape d'un deal | Admin, Commercial | Dropdown ou drag & drop |
| Visualiser le pipeline | Tous | Kanban 6 étapes + vue liste |

### Module Tâches

| Cas d'utilisation | Acteur(s) | Description |
|-------------------|-----------|-------------|
| Créer une tâche | Tous | Titre, priorité, échéance, contact/lead |
| Marquer comme terminée | Tous | Checkbox de complétion |
| Filtrer par priorité | Tous | Urgent / Normal |
| Vue Calendrier | Tous | Visualisation mensuelle des tâches |
| Assigner à un utilisateur | Admin, Commercial | Attribution avec notification email |

### Module Emails & Communications

| Cas d'utilisation | Acteur(s) | Description |
|-------------------|-----------|-------------|
| Envoyer email manuel | Admin, Commercial | Modal depuis fiche contact via Brevo |
| Consulter l'historique | Admin | Tous les emails avec statuts |
| Voir les stats emailing | Admin | Total, taux succès, répartition par type |
| Créer un template | Admin, Commercial | Modèle avec variables dynamiques |
| Utiliser un template | Admin, Commercial | Envoi depuis un modèle existant |

### Module Administration

| Cas d'utilisation | Acteur | Description |
|-------------------|--------|-------------|
| Voir tous les utilisateurs | Admin | Liste avec rôles et statuts |
| Créer un utilisateur | Admin | Ajout d'un membre de l'équipe |
| Modifier le rôle | Admin | Admin / Commercial / Utilisateur |
| Activer / Désactiver | Admin | Gestion des accès |

---

##  Fonctionnalités détaillées

###  Authentification

- Connexion avec email + mot de passe → retourne un JWT stocké en localStorage
- Inscription avec envoi automatique d'un **email de bienvenue** via Brevo
- Réinitialisation du mot de passe en 2 étapes :
  1. Saisie de l'email → envoi d'un code à 6 chiffres (expire dans 15 minutes)
  2. Saisie du code + nouveau mot de passe
- 3 niveaux de rôles : `admin`, `commercial`, `user`
- Middleware `requireAuth` sur toutes les routes protégées
- Middleware `requireAdmin` pour les actions administratives sensibles

###  Dashboard analytique

**KPI principaux filtrables par période :**
-  CA encaissé avec évolution vs période précédente
-  Taux de conversion leads → deals gagnés
-  Nouveaux prospects sur la période
-  Tâches en retard à traiter en priorité

**Filtres de période :** Aujourd'hui / 7 jours / 30 jours / Ce mois / Cette année / Personnalisé

**Blocs analytiques :**
- Objectif du mois avec barre de progression
- Pipeline commercial par étape
- Graphique évolution CA sur 12 mois (area chart)
- Répartition des deals par statut avec pourcentages
- Funnel de conversion leads avec taux global
- Activité récente de toute l'équipe
- Mon activité personnelle (mes deals, leads, tâches)
- Performance emailing (taux de succès, répartition par type)

###  Contacts

- Recherche full-text (nom, email, ville, téléphone)
- Filtrage par entreprise, tri par colonne
- Fiche détaillée avec édition inline de tous les champs
- Résumé : nombre de deals, tâches, emails, tâches terminées
- Panel droit : Deals & Tâches + Emails
- Envoi d'email via modal (destinataire modifiable, sujet, corps)
- Toast vert de confirmation après envoi
- Notes internes horodatées
- Abonnements aux communications (Newsletter, Promotions, Rappels)

###  Entreprises

- Recherche par nom, filtrage par secteur d'activité
- Export CSV de la liste complète
- Fiche : résumé financier (deals ouverts/gagnés, CA total)
- Phase de vie : Prospect / Client / Partenaire / Inactif
- Contacts associés + toutes les transactions

###  Leads

- **Vue Kanban** : 4 colonnes (Nouveau / En cours / Converti / Perdu) avec montant par colonne
- **Vue Liste** : tableau avec filtres statut et commercial
- Sources trackées : Facebook / LinkedIn / Site web / Référence / Téléphone
- Changement de statut via dropdown inline ou drag & drop

###  Pipeline de ventes

- **Vue Kanban** : 6 étapes avec montant total par colonne et barre de progression par deal
- **Vue Liste** : tableau avec probabilité, commercial assigné, date de clôture
- Filtrage par étape
- KPI en en-tête : pipeline actif, deals gagnés, total deals

###  Tâches

- **Vue Liste** : statut, priorité, titre, échéance, contact/lead associé
- **Vue Calendrier** : calendrier mensuel avec tâches positionnées
- Filtres rapides : En retard / Urgent
- KPI : À faire, Terminées, En retard, Urgentes, Total

###  Emails & Templates

- Historique de tous les emails avec filtres par type
- KPI : Total envoyés, 30 derniers jours, Destinataires uniques, Échecs
- CRUD complet des templates avec variables `{{prenom}}`, `{{nom}}`, `{{entreprise}}`, `{{date}}`
- Envoi direct depuis un template existant

---

##  Pipeline de ventes & Workflow

### Étapes du pipeline FormaPro

| Étape | Probabilité | Description | Action commerciale |
|-------|-------------|-------------|-------------------|
| **Prospect** | 10% | Premier contact établi | Appel de découverte |
| **Qualification** | 30% | Besoins identifiés, budget confirmé | Présentation des formations |
| **Proposition** | 55% | Devis envoyé, attente de retour | Relance, réponse aux objections |
| **Négociation** | 75% | Négociation tarifaire en cours | Ajustement de l'offre |
| **Gagné ✓** | 100% | Formation vendue | Onboarding + email automatique |
| **Perdu** | 0% | Opportunité perdue | Analyse des raisons |

### Cycle de vie d'un lead

```
📥 Nouveau lead créé
   Source : Facebook / LinkedIn / Site web / Référence / Téléphone
        │
        ▼
📧 Email automatique → Commercial assigné notifié
        │
        ▼
🔄 Commercial traite le lead → Statut "En cours"
        │
        ├── Pas intéressé ──► ❌ PERDU
        │
        ▼
✅ Lead qualifié → Conversion en deal dans le pipeline
        │
        ▼
📧 Email automatique "Lead converti" envoyé
        │
        ▼
📊 Suivi dans le pipeline de ventes
        │
        ├── Négociation échouée ──► ❌ PERDU
        │
        ▼
🏆 Deal GAGNÉ → Email automatique "Deal gagné"
```

---

##  Emails automatiques Brevo

9 types d'emails automatiques déclenchés par des événements CRM :

| # | Type | Déclencheur | Destinataire |
|---|------|-------------|--------------|
| 1 |  **Bienvenue** | Création d'un nouveau compte | Nouvel utilisateur |
| 2 |  **Deal gagné** | Deal passé au statut "Gagné" | Commercial responsable |
| 3 |  **Nouveau lead** | Lead assigné à un commercial | Commercial assigné |
| 4 |  **Lead converti** | Statut lead passé à "Converti" | Commercial responsable |
| 5 |  **Tâche en retard** | Tâche non complétée après échéance | Utilisateur assigné |
| 6 |  **Tâche assignée** | Nouvelle tâche assignée | Utilisateur assigné |
| 7 |  **Reset mot de passe** | Demande de réinitialisation | Utilisateur demandeur |
| 8 |  **Rôle modifié** | Changement de rôle par l'admin | Utilisateur concerné |
| 9 |  **Statut compte** | Activation ou désactivation | Utilisateur concerné |

### Implémentation technique

```javascript
// services/brevo.js
async function sendEmail({ to, subject, htmlContent, type, contactId, userId }) {
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: process.env.BREVO_SENDER_NAME, email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent
    }, { headers: { 'api-key': process.env.BREVO_API_KEY } });
    status = 'sent';
  } catch (error) {
    status = 'failed';
  } finally {
    // Enregistrement systématique (même en cas d'échec Brevo)
    await logEmail({ to, subject, type, status, contactId, userId });
  }
}
```

---

##  Installation locale

### Prérequis

- [Node.js](https://nodejs.org) >= 18
- [Docker](https://docker.com) et Docker Compose
- Compte [Neon](https://Neon.com) (PostgreSQL cloud gratuit)
- Compte [Brevo](https://brevo.com) (clé API gratuite)

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-username/formaprocrm.git
cd formaprocrm

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Lancer l'application avec Docker
docker compose up -d

# 4. Vérifier que les conteneurs tournent
docker compose ps
```

### Accès en local

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3001 | Interface CRM |
| **Backend API** | http://localhost:3000 | API REST |
| **Adminer** | http://localhost:8080 | Interface base de données |

---

##  Déploiement CI/CD

```
 Développement local (Docker)
        │
        │ git push
        ▼
 GitHub (dépôt distant)
        │
        │ Push sur branche main
        ▼
 Vercel détecte le push (webhook GitHub)
        │
        │ Build automatique Next.js + Node.js
        ▼
 Déploiement en production automatique
        │
        ▼
 Application disponible en ligne
```

### Infrastructure cloud

| Service | Usage | Plan |
|---------|-------|------|
| **Vercel** | Hébergement frontend + backend | Gratuit (Hobby) |
| **Neon** | Base de données PostgreSQL | Gratuit (500MB) |
| **Brevo** | Envoi d'emails | Gratuit (300 emails/jour) |
| **GitHub** | Versioning + CI/CD | Gratuit |

---

##  Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Base de données
DATABASE_URL=postgresql://neondb_owner:npg_n9yAX4GoaQOU@ep-noisy-fire-aibo4zsf-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Authentification
JWT_SECRET=un_secret_long

# Brevo (Emailing)
BREVO_API_KEY=xkeysib-98..........
BREVO_SENDER_EMAIL=kenzamenad6@gmail.com
BREVO_SENDER_NAME="FormaPro CRM"

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
# En production : NEXT_PUBLIC_API_URL=https://formaprocrmbackend.vercel.app
```
---

##  Structure du projet

```
formaprocrm/
│
├──  frontend/                      # Application Next.js
│   ├── app/
│   │   ├── dashboard/page.tsx        # Dashboard analytique
│   │   ├── contacts/
│   │   │   ├── page.tsx              # Liste des contacts
│   │   │   └── [id]/page.tsx         # Fiche contact détaillée
│   │   ├── companies/
│   │   │   ├── page.tsx              # Liste des entreprises
│   │   │   └── [id]/page.tsx         # Fiche entreprise
│   │   ├── leads/page.tsx            # Leads (Kanban + Liste)
│   │   ├── pipeline/page.tsx         # Pipeline (Kanban + Liste)
│   │   ├── tasks/page.tsx            # Tâches (Liste + Calendrier)
│   │   ├── emails/
│   │   │   ├── page.tsx              # Historique des emails
│   │   │   └── templates/page.tsx    # Templates d'emails
│   │   ├── users/page.tsx            # Gestion utilisateurs
│   │   ├── settings/page.tsx         # Paramètres + Mon profil
│   │   ├── login/page.tsx            # Page de connexion
│   │   ├── signup/page.tsx           # Page d'inscription
│   │   └── forgot-password/page.tsx  # Reset mot de passe
│   └── components/                   # Composants réutilisables
│
├──  backend/                       # API Node.js + Express
│   ├── server.js                     # Point d'entrée
│   ├── routes/
│   │   ├── auth.js                   # Authentification
│   │   ├── contacts.js               # CRUD contacts
│   │   ├── companies.js              # CRUD entreprises
│   │   ├── leads.js                  # CRUD leads
│   │   ├── deals.js                  # CRUD deals
│   │   ├── tasks.js                  # CRUD tâches
│   │   ├── emails.js                 # Emails + templates
│   │   ├── users.js                  # Gestion utilisateurs
│   │   └── dashboard.js              # KPI et statistiques
│   └── services/
│       └── brevo.js                  # Service emailing Brevo
│
├── 📄 docker-compose.yml             # Configuration Docker locale
├── 📄 .env.example                   # Template variables d'environnement
└── 📄 README.md                      # Cette documentation
```

---

##  Sécurité

| Mesure | Implémentation | Détail |
|--------|----------------|--------|
| **Hashage MDP** | bcrypt | 10 rounds de salage, irréversible |
| **Authentification** | JWT | Expiration 7 jours |
| **Protection routes** | requireAuth | Vérifie le token à chaque requête |
| **Protection admin** | requireAdmin | Vérifie le rôle `admin` dans le token |
| **Variables sensibles** | .env + Vercel | Jamais committées dans le code |
| **Connexion DB** | SSL obligatoire | Connexion chiffrée via Neon |
| **CORS** | Configuré Express | Origines autorisées uniquement |

---
<div align="center">

**FormaPro CRM — Projet de développement web Full Stack — Mars 2026**

*Next.js · Node.js · PostgreSQL · Brevo · Vercel · Docker*

</div>
