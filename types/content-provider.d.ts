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

declare module "virtual:posts" {
  const posts: Record<string, Promise<PostModule>>;
  export default posts;
}

declare module "virtual:pages" {
  const pages: Record<string, Promise<PostModule>>;
  export default pages;
}