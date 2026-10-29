// Vercel Blob (https, host *.public.blob.vercel-storage.com) o foto sembrada /seed/<archivo>.
export const IMAGE_URL_RE =
  /^(?:https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/\S+|\/seed\/[a-z0-9_-][a-z0-9._-]*)$/i;
export const isAllowedImageUrl = (url: string): boolean => IMAGE_URL_RE.test(url);
