export const siteConfig = {
  title: 'zhongpeng',
  basePath: '/',
  navigation: [
    { title: 'Posts', slug: '/posts' },
    { title: 'Photos', slug: '/photos' }
  ],
  footer: {
    copyrightName: 'zhongpeng',
    socialLinks: [
      {
        label: 'Email',
        href: 'mailto:lizhongpeng2@gmail.com'
      },
      {
        label: 'GitHub',
        href: 'https://github.com/lavanceeee'
      },
      {
        label: 'Zhihu',
        href: 'https://www.zhihu.com/people/li-he-han-50'
      }
    ]
  }
} as const;
