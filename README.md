# Content Manager — a simple WordPress-style admin for Astro websites

Manage **posts, categories, custom fields (like ACF) and media** for your Astro website.
Built with **Next.js + shadcn/ui**, stores everything in **Firebase**. Black & white theme, with dark mode.

| WordPress                     | Here                                   |
| ----------------------------- | -------------------------------------- |
| Posts → All Posts / Add New   | **Posts** / **New Post**               |
| Posts → Categories            | **Categories** (with sub-categories)   |
| ACF → Field Groups            | **Custom Fields**                      |
| Media Library                 | **Media**                              |
| Settings → General            | **Settings**                           |
| Dashboard / Quick Draft       | **Dashboard**                          |

---

## Contents

1. [What you need](#1-what-you-need)
2. [Set up Firebase (one time)](#2-set-up-firebase-one-time)
3. [Run the admin panel](#3-run-the-admin-panel)
4. [Make yourself an admin](#4-make-yourself-an-admin)
5. [Protect your data (security rules)](#5-protect-your-data-security-rules)
6. [How to use it](#6-how-to-use-it)
7. [Connect your Astro site](#7-connect-your-astro-site)
8. [Put the admin panel online](#8-put-the-admin-panel-online)
9. [Folder structure](#9-folder-structure)
10. [How the data is stored](#10-how-the-data-is-stored)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What you need

- **Node.js 20 or newer** (Node 24 LTS recommended) — <https://nodejs.org>
- A **Google account** for Firebase — <https://console.firebase.google.com>

---

## 2. Set up Firebase (one time)

1. Go to <https://console.firebase.google.com> → **Add project** (or open your existing project).
2. **Authentication** → *Get started* → **Sign-in method** → enable **Email/Password**.
3. **Firestore Database** → *Create database* → choose a location near your users (e.g. `asia-south1` Mumbai) → start in **production mode**.
4. **Storage** → *Get started*. (Firebase may ask you to switch to the **Blaze** pay-as-you-go plan for Storage. Small websites normally stay inside the free usage.)
5. **Project settings** (⚙️ icon) → **Your apps** → click the **`</>` Web** icon → give it a name → **Register app**.
   You'll see a `firebaseConfig` with `apiKey`, `authDomain`, `projectId` … keep this page open.

---

## 3. Run the admin panel

Open a terminal in this folder and run:

```bash
npm install
```

Copy `.env.example` → rename the copy to **`.env.local`** → paste the values from step 2.5:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
```

Start it:

```bash
npm run dev
```

Open **<http://localhost:3000>**.

---

## 4. Make yourself an admin

For safety, only accounts you approve can use the admin panel.

1. Firebase Console → **Authentication** → **Users** → **Add user** → enter your email and a password.
2. Sign in at <http://localhost:3000/login>.
3. The panel will say *"This account is not an admin yet"* and show your **User ID** with a **Copy** button.
4. Firebase Console → **Firestore Database** → **Start collection** → Collection ID: **`admins`** →
   Document ID: **paste your User ID** → add any field (e.g. `name` = `Sujay`) → **Save**.
5. Back in the admin panel click **"I've done it — refresh"**. You're in. 🎉

To add another editor later: create their user in Authentication, then add their User ID to `admins` the same way.

> Tip: in **Authentication → Settings → User actions** you can untick *"Enable create (sign-up)"* so nobody can create accounts except you.

---

## 5. Protect your data (security rules)

This folder includes rules that let your **website read** published content but only **admins write**.

**Easiest way (copy & paste):**

- Firebase Console → **Firestore Database → Rules** → replace everything with the contents of [`firestore.rules`](firestore.rules) → **Publish**.
- Firebase Console → **Storage → Rules** → replace everything with the contents of [`storage.rules`](storage.rules) → **Publish**.

**Or with the Firebase CLI:**

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## 6. How to use it

### Categories
Create categories such as **Blog**, **News**, **Events**. Choose a *Parent* to make a sub-category.
The **slug** (e.g. `news`) is what your Astro site uses to fetch that category's posts.

### Posts
- **New Post** → write a title and content, tick categories on the right, add a featured image.
- **Save draft** keeps it private. **Publish** puts it on your website.
- Pick a future **Publish date** to schedule a post.
- **Excerpt** and **SEO** boxes are optional.
- On the Posts list you can filter by status/category, search, duplicate and delete.

### Custom Fields (like ACF)
1. **Custom Fields → Add field group**, e.g. *"Event Details"*.
2. **Add field** for each extra box: *Event date* (Date), *Venue* (Text), *Ticket type* (Dropdown)…
3. Under **Location**, choose *All posts* or *Posts in these categories → Events*.
4. Now when you tick **Events** on a post, the *Event Details* box appears automatically.

Available field types: Text, Text Area, Rich Text, Number, Email, Link (URL), Date, Dropdown, Yes/No, Image, Gallery, File.

### Media
Upload images and PDFs (up to 20 MB). Click a file to add **alt text**, rename it, copy its link or delete it.

### Settings
Set your website name, website address (enables *View on website* buttons) and post URL pattern (e.g. `/blog/{slug}`).

---

## 7. Connect your Astro site

See **[`astro-integration/README.md`](astro-integration/README.md)** — copy two files into your Astro project and use:

```ts
const posts = await getPosts({ category: "blog" });     // posts in a category
const post  = await getPostBySlug("annual-meetup");     // one post
post.customFields.event_date;                           // custom field (like get_field)
```

---

## 8. Put the admin panel online

**Vercel (free, easiest):**

1. Push this folder to a GitHub repository.
2. Go to <https://vercel.com> → **Add New → Project** → import the repository.
3. Under **Environment Variables**, add the six `NEXT_PUBLIC_FIREBASE_…` values from your `.env.local`.
4. **Deploy**. You'll get a link like `https://your-cms.vercel.app`.
5. Firebase Console → **Authentication → Settings → Authorized domains** → **Add domain** → add your Vercel domain (needed for "Forgot password" and sign-in).

You can also run it on any server with `npm run build` then `npm start`.

---

## 9. Folder structure

```
cms-admin/
├── src/
│   ├── app/                         ← the PAGES (each folder = a URL)
│   │   ├── (auth)/login/            → /login
│   │   └── (dashboard)/             → everything after signing in
│   │       ├── dashboard/           → /dashboard
│   │       ├── posts/               → /posts, /posts/new, /posts/[id]
│   │       ├── categories/          → /categories
│   │       ├── custom-fields/       → /custom-fields, /new, /[id]
│   │       ├── media/               → /media
│   │       └── settings/            → /settings
│   │
│   ├── features/                    ← each section of the CMS lives in its own folder
│   │   ├── posts/
│   │   │   ├── addform/             → the Add/Edit post screen
│   │   │   ├── components/          → the posts list table
│   │   │   ├── hooks/               → load posts into a page
│   │   │   ├── lib/                 → small helpers (status badge)
│   │   │   ├── repository/          → reads/writes to Firestore
│   │   │   ├── services/            → rules (unique slugs, required fields…)
│   │   │   └── types.ts             → what a "Post" looks like
│   │   ├── categories/              (same layout)
│   │   ├── custom-fields/           (same layout)
│   │   ├── media/                   (same layout)
│   │   ├── settings/
│   │   └── dashboard/
│   │
│   ├── components/                  ← shared building blocks
│   │   ├── ui/                      → shadcn/ui (buttons, inputs, dialogs…)
│   │   ├── layout/                  → sidebar, top bar, page header
│   │   │   └── nav-items.ts         → ✏️ edit the left menu here
│   │   ├── forms/                   → rich text editor, form field
│   │   ├── auth/                    → login form, admin check
│   │   ├── providers/               → theme + login state
│   │   ├── confirm-dialog.tsx, empty-state.tsx, profile-menu.tsx, theme-toggle.tsx
│   │
│   ├── firebase/                    ← Firebase connection + collection names
│   ├── hooks/                       ← shared React hooks
│   └── lib/                         ← small helpers (slugify, dates, file sizes)
│
├── astro-integration/               ← files to copy into your Astro website
├── firestore.rules / storage.rules  ← security rules
├── firestore.indexes.json           ← database indexes used by the Astro helpers
└── .env.example                     ← copy to .env.local and fill in
```

**Want to change the colours?** Edit `src/app/globals.css` (the `:root` block is light mode, `.dark` is dark mode).

---

## 10. How the data is stored

Firestore collections:

| Collection     | What's inside                                                                 |
| -------------- | ----------------------------------------------------------------------------- |
| `posts`        | `title, slug, content (HTML), excerpt, featuredImage, categoryIds, categorySlugs, status ("draft" / "published"), publishedAt, seoTitle, seoDescription, customFields {…}, authorName, createdAt, updatedAt` |
| `categories`   | `name, slug, description, parentId`                                           |
| `fieldGroups`  | `title, location ("all" / "categories"), categoryIds, fields [ {label, name, type, required, …} ], active, order` |
| `media`        | `name, url, path, contentType, size, alt, width, height, createdAt`           |
| `settings`     | document `general`: `siteName, siteUrl, postUrlPattern`                       |
| `admins`       | one document per admin, **document ID = their Firebase User ID**              |

Uploaded files go to Firebase Storage under `media/YEAR/MONTH/…`.

---

## 11. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Connect Firebase to get started" screen | `.env.local` is missing or empty. Fill it in and restart `npm run dev`. |
| "This account is not an admin yet" | Add your User ID to the `admins` collection (step 4). |
| "You don't have permission…" when saving | Rules are published but your User ID isn't in `admins`, or the document ID has a typo/space. |
| Image upload fails | Storage isn't enabled, or `storage.rules` wasn't published. |
| Astro: "The query requires an index" | Click the link in the error, or run `firebase deploy --only firestore:indexes`. |
| Forgot password email not arriving | Check spam. On a live domain, add it under Authentication → Settings → Authorized domains. |
| Testing without touching real data | Install the Firebase CLI, run `firebase emulators:start`, and set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local`. |
