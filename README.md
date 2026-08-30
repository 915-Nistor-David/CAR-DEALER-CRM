# CarFlow — CRM pentru dealeri auto

Aplicație de management pentru dealeri auto, dezvoltată ca proiect personal. Ideea a pornit din experiența directă de lucru cu o rețea de peste 100 de dealeri auto, ca Regional Sales Manager la o companie de finanțare auto — CarFlow își propune să rezolve nevoile operaționale reale ale unui dealer: gestionarea stocului de mașini, a clienților și a vânzărilor, într-o singură platformă.

> **Status: în dezvoltare activă.** Backend-ul și frontend-ul sunt funcționale, cu funcționalitățile de bază implementate. Proiectul este extins constant cu noi module.

## Funcționalități implementate

- **Autentificare și autorizare** — login securizat bazat pe JSON Web Tokens (JWT).
- **Gestionare stoc auto** — evidența mașinilor disponibile în dealer.
- **Gestionare clienți** — administrarea bazei de clienți ai dealerului.
- **Gestionare vânzări/tranzacții** — înregistrarea și urmărirea tranzacțiilor de vânzare.

## Funcționalități planificate

- Rapoarte și statistici de vânzări
- Notificări pentru clienți (ex. urmărire lead-uri, reminder-e)
- Rol-uri multiple (admin, vânzător) cu permisiuni diferențiate
- Îmbunătățiri UI/UX și validări suplimentare

## Stack tehnologic

**Backend**
- ASP.NET Core Web API (C#)
- Entity Framework Core
- PostgreSQL
- JWT pentru autentificare

**Frontend**
- React

**Deployment**
- Docker / Docker Compose (configurare inclusă în repo, inclusiv variantă cu tunnel pentru expunere externă)

## Structura proiectului

```
CAR-DEALER-CRM/
├── backend/
│   └── CarFlow.API/          # ASP.NET Core Web API
├── frontend/
│   └── carflow-client/       # Aplicație React
├── deploy/                   # Fișiere/scripturi de deployment
├── docker-compose.yml
├── docker-compose.tunnel.yml
└── CarFlow.sln
```

## Cum rulezi proiectul local

### Cerințe
- .NET SDK (versiunea folosită de `CarFlow.sln`)
- Node.js
- PostgreSQL (local sau via Docker)
- Docker (opțional, pentru rulare containerizată)

### Backend

```bash
cd backend/CarFlow.API
dotnet restore
dotnet run
```

### Frontend

```bash
cd frontend/carflow-client
npm install
npm run dev
```

### Cu Docker

```bash
docker-compose up --build
```

