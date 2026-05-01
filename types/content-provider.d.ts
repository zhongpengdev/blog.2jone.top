interface PostMetadata {
  title: string;
  tags?: string[];
  description?: string;
  date?: string | Date;
  slug: string;
}

declare module "virtual:postIndex" {
  const postIndex: PostMetadata[];
  export default postIndex;
}

declare module "virtual:post" {
  const posts: Record<string, import('vue').Component>;
  export default posts;
}

declare module "virtual:pages" {
  const pages: Record<string, import('vue').Component>;
  export default pages;
}