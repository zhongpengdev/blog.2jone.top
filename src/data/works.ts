export const worksData = {
  projects: [
    {
      name: 'ChatIE',
      description:
        "It's a rebuilt version of ChatIE and I carry out the engineering transformation of this project.",
      tags: ['NLP'],
      links: {
        Demo: 'http://chatie.service.2jone.top/',
        Github: 'https://github.com/lavanceeee/ChatIE',
        Blog: 'https://www.2jone.top/notes/chatie/'
      }
    },
    {
      name: 'Laser-Simulation-Platform-Qt',
      description: 'A laser reflection optical simulation platform built using Qt.',
      tags: ['PyQt', 'Laser Simulation'],
      links: {
        Github: 'https://github.com/lavanceeee/Laser-Reflection-Simulation-Qt'
      }
    },
    {
      name: 'Michelson-Fringe-Counting-Qt',
      description: 'Michelson interference fringe counting software implemented with PyQt and OpenCV.',
      tags: ['PyQt', 'OpenCV', 'Computer Vision'],
      links: {
        Demo: 'https://kama.2jone.top',
        Github: 'https://github.com/lavanceeee/Michelson-Fringe-Counting-Qt'
      }
    }
  ],
  publications: []
} as const;
