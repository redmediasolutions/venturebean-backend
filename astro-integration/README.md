# Astro integration

Copy these files into your Astro website to show the content you manage in the admin panel.

```
astro-integration/
├── .env.example                  → copy to your Astro project as .env
└── src/
    ├── lib/
    │   ├── firebase.ts           → connects to Firebase (read-only)
    │   └── cms.ts                → getPosts(), getPostBySlug(), getCategories() …
    └── pages/
        ├── blog/index.astro      → example: list of posts in the "blog" category
        ├── blog/[slug].astro     → example: single post page (with custom fields)
        └── category/[slug].astro → example: one page per category
```

## 1. Install

In your **Astro** project:

```bash
npm install firebase
```

Copy `src/lib/firebase.ts` and `src/lib/cms.ts` into your project, and create a `.env` file with the same Firebase keys you used for the admin panel (note the `PUBLIC_` prefix).

## 2. Use it in a page

```astro
---
import { getPosts } from "../lib/cms";
const posts = await getPosts({ category: "news", limit: 6 });
---
{posts.map((p) => <a href={`/blog/${p.slug}`}>{p.title}</a>)}
```

| WordPress / ACF                  | This CMS                                          |
| -------------------------------- | ------------------------------------------------- |
| `the_title()`                    | `post.title`                                      |
| `the_content()`                  | `<Fragment set:html={post.content} />`            |
| `the_excerpt()`                  | `post.excerpt`                                    |
| `get_the_post_thumbnail_url()`   | `post.featuredImage?.url`                         |
| `get_field('event_date')`        | `post.customFields.event_date`                    |
| `WP_Query(['category_name' => 'news'])` | `getPosts({ category: "news" })`           |

Custom field values by type:

| Field type                         | Value                                   |
| ---------------------------------- | --------------------------------------- |
| Text, Text Area, Email, Link, Dropdown | `string`                            |
| Rich Text                          | HTML `string` (use `set:html`)          |
| Number                             | `number` or `null`                      |
| Date                               | `"2026-11-21"` (string)                 |
| Yes / No                           | `true` / `false`                        |
| Image, File                        | `{ url, alt, name, width, height }` or `null` |
| Gallery                            | array of `{ url, alt, … }`              |

## 3. New posts showing up — choose one

**A. Server-rendered (recommended — new posts appear instantly)**
The example pages use `export const prerender = false`. This needs an SSR adapter in Astro, e.g. `npx astro add vercel` or `npx astro add netlify` or `npx astro add node`.

**B. Fully static**
Delete the `prerender = false` line and add `getStaticPaths` to `[slug].astro`:

```astro
---
import { getPosts } from "../../lib/cms";
export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}
const { post } = Astro.props;
---
```

With a static site you need to **rebuild** your website after publishing (e.g. a Vercel/Netlify "Deploy Hook").

## 4. "The query requires an index" error

The first time `getPosts({ category })` runs, Firestore may show an error with a link. Click the link — it creates the index for you (takes 1–2 minutes). Or run `firebase deploy --only firestore:indexes` from the admin panel folder.
