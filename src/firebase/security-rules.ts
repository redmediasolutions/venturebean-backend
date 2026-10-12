/**
 * Copies of firestore.rules and storage.rules, so the app can show them with a
 * "Copy" button during setup. If you edit the .rules files, update these too.
 */
export const FIRESTORE_RULES = `rules_version = '2';

// ------------------------------------------------------------------
//  Firestore security rules for the CMS.
//  • Your public website can READ published posts, categories, media.
//  • Only ADMINS can create / edit / delete content.
//  • Admin = a user whose ID is in the "admins" collection.
//  • The very first account created becomes the owner (one time only).
// ------------------------------------------------------------------
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }
    function isAdmin() {
      return signedIn()
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    function setupDone() {
      return exists(/databases/$(database)/documents/settings/setup);
    }

    match /admins/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isAdmin());
      // Admins add team members. The first-ever account may add ITSELF,
      // only while setup isn't done, and only together with settings/setup.
      allow create: if isAdmin()
        || (signedIn() && request.auth.uid == uid && !setupDone()
            && getAfter(/databases/$(database)/documents/settings/setup).data.ownerUid == uid);
      allow update: if isAdmin();
      // Admins can remove others, but not themselves.
      allow delete: if isAdmin() && request.auth.uid != uid;
    }

    match /settings/{id} {
      allow read: if true;
      // "setup" is written once, by the first owner (or an existing admin).
      allow create: if id == 'setup' && signedIn() && !setupDone()
        && request.resource.data.ownerUid == request.auth.uid
        && (isAdmin() || existsAfter(/databases/$(database)/documents/admins/$(request.auth.uid)));
      allow create, update, delete: if id != 'setup' && isAdmin();
    }

    // Drafts stay private; published posts are public.
    match /posts/{postId} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow write: if isAdmin();
    }

    match /categories/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /media/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /fieldGroups/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
`;

export const STORAGE_RULES = `rules_version = '2';

// Uploaded files are public (so your website can show them),
// but only admins can upload or delete. Max file size: 20 MB.
service firebase.storage {
  match /b/{bucket}/o {
    match /media/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid))
        && (request.resource == null || request.resource.size < 20 * 1024 * 1024);
    }
  }
}
`;
