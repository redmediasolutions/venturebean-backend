/**
 * Admin URLs for posts:
 *   /posts                      all posts
 *   /posts/coaching             posts in the "coaching" category
 *   /posts/coaching/new         new post in that category
 *   /posts/coaching/<postId>    edit a post (opened from that category)
 */
export function postsPath(categorySlug?: string | null) {
  return categorySlug ? `/posts/${encodeURIComponent(categorySlug)}` : "/posts";
}
