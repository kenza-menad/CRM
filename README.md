# 🟢 FormaPro CRM

> CRM métier pour agence de formation — gestion des contacts, leads, deals, tâches et pipeline commercial.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)

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
| `user` | Lecture + ses propres tâches |