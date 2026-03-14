type Frontmatter = {
  title?: string;
  date?: string;
  slug?: string;
  description?: string;
  tags?: string[] | { name?: string; slug?: string }[];
};

type ContentModule = {
  frontmatter?: Frontmatter;
  Content?: unknown;
};

export type ContentListItem = {
  title: string;
  date: string;
  formattedDate: string;
  slug: string;
  description?: string;
  tags: { name: string; slug: string }[];
};

export type ContentPage = ContentListItem & {
  Content: ContentModule['Content'];
};

const postModules = import.meta.glob('../content/posts/*/index.{md,mdx}', {
  eager: true
}) as Record<string, ContentModule>;

const noteModules = import.meta.glob('../content/notes/*/index.mdx', {
  eager: true
}) as Record<string, ContentModule>;

const normalizeSlug = (value: string) => {
  if (!value) {
    return '/';
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, '/');

  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value));

const normalizeTags = (value: Frontmatter['tags']) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tag) => {
      if (typeof tag === 'string') {
        return {
          name: tag,
          slug: `/tags/${tag.toLowerCase().replace(/\s+/g, '-')}`
        };
      }

      if (tag?.name) {
        return {
          name: tag.name,
          slug: normalizeSlug(tag.slug ?? `/tags/${tag.name.toLowerCase().replace(/\s+/g, '-')}`)
        };
      }

      return null;
    })
    .filter((tag): tag is { name: string; slug: string } => Boolean(tag));
};

const toPages = (modules: Record<string, ContentModule>): ContentPage[] =>
  Object.values(modules)
    .map((module) => {
      const frontmatter = module.frontmatter ?? {};

      if (!frontmatter.title || !frontmatter.date || !frontmatter.slug || !module.Content) {
        return null;
      }

      return {
        title: frontmatter.title,
        date: frontmatter.date,
        formattedDate: formatDate(frontmatter.date),
        slug: normalizeSlug(frontmatter.slug),
        description: frontmatter.description,
        tags: normalizeTags(frontmatter.tags),
        Content: module.Content
      };
    })
    .filter((item): item is ContentPage => Boolean(item))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

const posts = toPages(postModules);
const notes = toPages(noteModules);

export const getPosts = (): ContentListItem[] => posts;

export const getNotes = (): ContentListItem[] => notes;

export const getAllContentPages = (): ContentPage[] => [...posts, ...notes];
