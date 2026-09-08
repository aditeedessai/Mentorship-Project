# Google Calendar Integration — Setup Guide

This document explains how to configure Google Calendar integration for the Jot Study Planner.

## 1. Google Cloud Project Setup

### 1.1 Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).

### 1.2 Enable Google Calendar API

1. In the project dashboard, go to **APIs & Services → Library**.
2. Search for **Google Calendar API**.
3. Click **Enable**.

### 1.3 Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Select **External** user type (or **Internal** if using Google Workspace).
3. Fill in the required fields:
   - **App name**: `Jot Study Planner`
   - **User support email**: your email
   - **Developer contact**: your email
4. Add the scope: `https://www.googleapis.com/auth/calendar.events`
5. Add test users (your Google account email) if in **Testing** mode.
6. Save.

### 1.4 Create OAuth 2.0 Client Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Select **Web application** as the application type.
4. Set the name to `Jot Backend`.
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8001/api/google-calendar/callback
   ```
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret**.

## 2. Environment Variables

Add the following to `backend/.env`:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=<your-client-id-from-step-1.4>
GOOGLE_CLIENT_SECRET=<your-client-secret-from-step-1.4>
GOOGLE_REDIRECT_URI=http://localhost:8001/api/google-calendar/callback
FRONTEND_URL=http://localhost:5173
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY=<generate-with-command-below>
```

### Generate the Encryption Key

Run this command to generate a Fernet encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copy the output and set it as `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`.

> **Important**: Do NOT commit this key or any secrets to version control. The `.env` file is already in `.gitignore`.

## 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The new dependencies added for this feature:
- `google-api-python-client` — Google Calendar API client
- `google-auth` — Google authentication
- `google-auth-oauthlib` — OAuth 2.0 flow helpers
- `cryptography` — Fernet encryption for refresh tokens

## 4. Database Migration

Apply the new migration to create the `google_calendar_connections` and `google_calendar_events` tables:

### Option A: Supabase CLI
```bash
supabase db push
```

### Option B: Direct SQL
Run the SQL from `supabase/migrations/20260908070000_add_google_calendar_tables.sql` against your Supabase database.

You can use the Supabase dashboard SQL editor or `psql`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260908070000_add_google_calendar_tables.sql
```

## 5. Start the Application

### Backend
```bash
cd backend
uvicorn backend.api.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend-new
npm run dev
```

## 6. Usage

### Connect from Settings
1. Log in to Jot.
2. Go to **Settings**.
3. Find the **Google Calendar** section.
4. Click **Connect Google Calendar**.
5. Authorize Jot in the Google consent screen.
6. You'll be redirected back with a success message.

### Connect after Signup
After creating a new account and completing the student profile, you'll see an optional prompt to connect Google Calendar. You can connect then or skip and do it later from Settings.

### Disconnect
1. Go to **Settings → Google Calendar**.
2. Click **Disconnect**.
3. Your Jot tasks and exams remain unchanged — only the Google Calendar sync is removed.

## 7. How It Works

- When you create, update, or delete a **task** or **exam** in the Planner, the backend automatically syncs the change to your Google Calendar.
- **Tasks with a time** become timed Google Calendar events with a 30-minute popup reminder.
- **Tasks without a time** and **exams** become all-day Google Calendar events with appropriate reminders.
- If Google Calendar is temporarily unavailable, your Jot data is still saved — the sync will be retried on the next operation.
- Your Google OAuth tokens are encrypted at rest and never exposed to the frontend.
