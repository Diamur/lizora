/**
 * Генерация slug из произвольного текста.
 * Поддерживает кириллицу через транслитерацию.
 */

const cyrillicMap: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
  'з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
  'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu',
  'я':'ya',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(char => cyrillicMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/**
 * Проверяет допустимость MIME-типа для видео.
 */
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-ms-wmv',
];

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export function isAllowedMime(mimeType: string, type: 'video' | 'image' | 'document'): boolean {
  if (type === 'video')  return ALLOWED_VIDEO_MIMES.includes(mimeType);
  if (type === 'image')  return ALLOWED_IMAGE_MIMES.includes(mimeType);
  return true; // documents — допускаем разное
}
