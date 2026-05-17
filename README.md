# SwimTrack 🌊

A swim instructor portal for managing students and tracking their progress through swim levels.
Built with plain HTML, CSS, and JavaScript — hosted on GitHub Pages with Firebase as the backend.

---

## Project Structure

```
swimtrack/
├── index.html   ← All markup / UI
├── style.css    ← All styles
├── app.js       ← All logic + Firebase integration
└── README.md
```

---

## Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**, name it (e.g. `swimtrack`), follow the prompts
3. On the left sidebar, click **Build → Authentication**
   - Click **"Get started"**
   - Enable **Email/Password** provider → Save
4. On the left sidebar, click **Build → Firestore Database**
   - Click **"Create database"**
   - Choose **"Start in test mode"** (you can lock it down later with security rules)
   - Pick a region → Done

---

## Step 2 — Get Your Firebase Config

1. In the Firebase Console, click the **gear icon ⚙** → **Project settings**
2. Scroll down to **"Your apps"** → click the **`</>`** (Web) icon
3. Register the app (name it anything, e.g. `swimtrack-web`)
4. Copy the `firebaseConfig` object — it looks like this:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

5. Open **`app.js`** and replace the placeholder block at the top with your real values.

---

## Step 3 — Add Firestore Security Rules (Recommended)

In the Firebase Console → Firestore → **Rules** tab, replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /instructors/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each instructor can only read and write their own data.

---

## Step 4 — Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `swimtrack`)
2. Push your three files to the repo:

```bash
git init
git add index.html style.css app.js
git commit -m "Initial SwimTrack deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/swimtrack.git
git push -u origin main
```

3. In your GitHub repo → **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
   - Click **Save**

4. GitHub will give you a URL like: `https://YOUR_USERNAME.github.io/swimtrack/`

5. **Add your GitHub Pages URL to Firebase's authorized domains:**
   - Firebase Console → Authentication → **Settings** tab → Authorized domains
   - Click **Add domain** → paste your GitHub Pages URL (without `https://`)
   - Example: `your-username.github.io`

---

## How It Works

| Feature | How it's stored |
|---|---|
| User accounts | Firebase Authentication (Email/Password) |
| Instructor profile, levels, students, comments | Firestore — one document per instructor under `instructors/{uid}` |
| Sessions | Firebase Auth persists login automatically across page refreshes |

---

## Firestore Data Structure

```
instructors/
  {userId}/
    name:     "Jordan Miller"
    email:    "jordan@example.com"
    levels:   [ { id, name, desc }, ... ]
    students: [ { id, name, age, levelId, comments: [ { id, text, date } ] }, ... ]
```

---

## Local Development (no server needed)

Because this uses Firebase's CDN SDKs, you can open `index.html` directly in a browser — **but Firebase Auth blocks `file://` origins by default**.

To run locally, use a simple local server:

```bash
# Python 3
python -m http.server 8080

# Node (if you have npx)
npx serve .
```

Then open `http://localhost:8080` in your browser.
Add `localhost` to Firebase's authorized domains if it isn't already there.
