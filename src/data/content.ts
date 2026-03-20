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

type ContentModuleLoader = () => Promise<ContentModule>;

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

const postModules = import.meta.glob('../content/posts/*/index.{md,mdx}') as Record<string, ContentModuleLoader>;

const noteModules = import.meta.glob('../content/notes/*/index.mdx') as Record<string, ContentModuleLoader>;

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

const toPage = async (loadModule: ContentModuleLoader): Promise<ContentPage | null> => {
  const module = await loadModule();
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
};

const toPages = async (modules: Record<string, ContentModuleLoader>): Promise<ContentPage[]> => {
  const pages = await Promise.all(Object.values(modules).map((loadModule) => toPage(loadModule)));

  return pages
    .filter((item): item is ContentPage => Boolean(item))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
};

export const getPosts = async (): Promise<ContentListItem[]> => toPages(postModules);

export const getNotes = async (): Promise<ContentListItem[]> => toPages(noteModules);

export const getAllContentPages = async (): Promise<ContentPage[]> => {
  const [posts, notes] = await Promise.all([getPosts(), getNotes()]);
  return [...posts, ...notes];
};

export const getContentPageBySlug = async (slug: string): Promise<ContentPage | undefined> => {
  const normalizedSlug = normalizeSlug(slug);
  const pages = await getAllContentPages();

  return pages.find((page) => page.slug === normalizedSlug);
};
