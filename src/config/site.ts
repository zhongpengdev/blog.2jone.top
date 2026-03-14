export const siteConfig = {
  title: 'zhongpeng',
  basePath: '/',
  navigation: [
    { title: 'posts', slug: '/posts' },
    { title: 'photos', slug: '/photos' }
  ],
  footer: {
    copyrightName: 'zhongpeng',
    socialLinks: [
      {
        label: 'email',
        href: 'mailto:lizhongpeng2@gmail.com'
      },
      {
        label: 'github',
        href: 'https://github.com/lavanceeee'
      },
      {
        label: 'zhihu',
        href: 'https://www.zhihu.com/people/li-he-han-50'
      }
    ]
  }
} as const;
