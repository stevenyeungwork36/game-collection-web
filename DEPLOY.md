# Step-by-step: Git + Netlify + Render

Follow these in order. You need: a [GitHub](https://github.com) account, a [Netlify](https://netlify.com) account, and a [Render](https://render.com) account (all free to sign up).

---

## Part 1: Connect your folder to Git and GitHub

### 1.1 Open a terminal in your project folder

```bash
cd /Users/stevenyeung/Documents/coding_project/game-collection-web
```

### 1.2 Initialize Git (if not already)

```bash
git init
```

### 1.3 Add all files and make the first commit

```bash
git add .
git status   # optional: check what will be committed
git commit -m "Initial commit: game collection with frontend and backend"
```

### 1.4 Create a new repo on GitHub

1. Go to [github.com](https://github.com) and log in.
2. Click the **+** (top right) → **New repository**.
3. **Repository name:** e.g. `game-collection-web`.
4. **Public**, leave **README / .gitignore / license** unchecked (you already have files).
5. Click **Create repository**.

### 1.5 Connect your local repo to GitHub and push

GitHub will show you commands; use these (replace `YOUR_USERNAME` and `game-collection-web` with your repo):

```bash
git remote add origin https://github.com/YOUR_USERNAME/game-collection-web.git
git branch -M main
git push -u origin main
```

If GitHub asks for login, use a **Personal Access Token** (Settings → Developer settings → Personal access tokens) as the password, or use GitHub Desktop / SSH if you prefer.

---

## Part 2: Deploy frontend to Netlify (optional)

Use this if you only want the **static site** on Netlify. The **games that need the backend (Imposter, Exploding Kittens, Big Two) will not work** until you deploy the backend (e.g. on Render). The home page and UI will load.

### 2.1 Log in to Netlify

Go to [app.netlify.com](https://app.netlify.com) and sign in (e.g. with GitHub).

### 2.2 Add a new site from Git

1. Click **Add new site** → **Import an existing project**.
2. Choose **GitHub** and authorize Netlify if asked.
3. Pick your repository: **game-collection-web**.

### 2.3 Configure build (Netlify reads `netlify.toml`)

If `netlify.toml` is in the repo root with something like:

- **Build command:** `npm run build:frontend`
- **Publish directory:** `frontend/dist`

Netlify will use it. Otherwise set manually:

- **Build command:** `npm run build:frontend`
- **Publish directory:** `frontend/dist`
- **Base directory:** leave empty (repo root).

### 2.4 Deploy

Click **Deploy site**. Wait for the build to finish. You’ll get a URL like `https://random-name-123.netlify.app`.

**Note:** API calls from this URL will 404 until you deploy the backend and (if needed) point the frontend to it.

---

## Part 3: Deploy full app (frontend + backend) to Render

This runs your **Node backend** and serves the built frontend. All games work from one URL.

### 3.1 Log in to Render

Go to [dashboard.render.com](https://dashboard.render.com) and sign in (e.g. with GitHub).

### 3.2 Create a new Web Service

1. Click **New +** → **Web Service**.
2. Connect your **GitHub** account if not already.
3. Select the repository: **game-collection-web**.

### 3.3 Configure the service

- **Name:** e.g. `game-collection`.
- **Region:** choose one close to you (e.g. Oregon).
- **Branch:** `main`.
- **Runtime:** **Node**.
- **Build Command:**  
  `npm run install:all && npm run build`
- **Start Command:**  
  `npm start`
- **Instance type:** **Free** (if available).

(If your repo has a **Blueprint** and you use **New → Blueprint**, Render can read `render.yaml` and fill these for you.)

### 3.4 Environment (optional)

- Add **NODE_ENV** = `production` if you want.
- **PORT** is usually set by Render; your app already uses `process.env.PORT || 3001`.

### 3.5 Deploy

Click **Create Web Service**. Render will install deps, run the build, then start the backend. Your site will be at `https://game-collection.onrender.com` (or the name you chose).

**Free tier:** The service may **spin down** after ~15 minutes of no traffic. The first request after that can take 30–60 seconds to wake up.

---

## Summary

| Step | What you did |
|------|-------------------------------|
| 1    | `git init` → `git add .` → `git commit` in your project folder |
| 2    | Created a new repo on GitHub, added `origin`, pushed with `git push -u origin main` |
| 3    | (Optional) Netlify: Import repo, build = `npm run build:frontend`, publish = `frontend/dist` |
| 4    | Render: New Web Service from same repo, build = `npm run install:all && npm run build`, start = `npm start` |

After Part 1 and Part 3, your full app runs on Render. Part 2 is only if you want the static frontend on Netlify as well (e.g. for a separate frontend-only URL).
