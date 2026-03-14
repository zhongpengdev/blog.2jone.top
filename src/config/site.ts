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
        href: 'mailto:lizhongpeng2@gmail.com',
        icon: 'email'
      },
      {
        label: 'GitHub',
        href: 'https://github.com/lavanceeee',
        icon: 'github'
      },
      {
        label: 'Zhihu',
        href: 'https://www.zhihu.com/people/li-he-han-50',
        icon: 'zhihu'
      }
    ]
  }
} as const;
