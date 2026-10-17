import type { NightShelfBook } from '../types/library';

export const nightShelf: NightShelfBook[] = [
{
  id: 'ns-death-note',
  title: 'Death Note',
  author: 'Tsugumi Ohba & Takeshi Obata',
  category: 'Manga',
  genre: 'Psychological thriller',
  volumes: 12,
  isbn: '9781421501680',
  copies: 2,
  available: 1,
  note: 'Two geniuses outthinking each other for 12 volumes. The potato chip scene lives rent-free.',
  cover: "/image.png",
  accent: '#e5484d'
},
{
  id: 'ns-code-geass',
  title: 'Code Geass',
  author: 'Ichirō Ōkouchi, Gorō Taniguchi & Majiko!',
  category: 'Manga',
  genre: 'Mecha · Strategy',
  volumes: 8,
  isbn: '9781427605399',
  copies: 2,
  available: 2,
  note: 'Lelouch plays chess with an entire empire. That ending still hurts.',
  cover: "/image-1.png",
  accent: '#c9a2ff'
},
{
  id: 'ns-konosuba',
  title: 'KonoSuba',
  author: 'Natsume Akatsuki',
  category: 'Light Novel',
  genre: 'Isekai comedy',
  volumes: 17,
  isbn: '9780316553377',
  copies: 3,
  available: 3,
  note: 'The most useless party in any isekai, and I love all of them. EXPLOSION!',
  cover: "/image-2.png",
  accent: '#6cc4ff'
},
{
  id: 'ns-steins-gate',
  title: 'Steins;Gate',
  author: '5pb. & Nitroplus, art by Yomi Sarachi',
  category: 'Manga',
  genre: 'Sci-fi · Time travel',
  volumes: 3,
  isbn: '9781626920743',
  copies: 1,
  available: 0,
  note: 'Slow first half, then it never lets go. El Psy Kongroo.',
  cover: "/image-3.png",
  accent: '#b3b8ff'
},
{
  id: 'ns-zombieland-saga',
  title: 'Zombieland Saga',
  author: 'Cygames & MAPPA',
  category: 'Manga',
  genre: 'Idol comedy',
  volumes: 2,
  isbn: '9781975317010',
  copies: 2,
  available: 1,
  note: 'Zombie idols saving Saga Prefecture. It makes zero sense and it absolutely rules.',
  cover: "/image-4.png",
  accent: '#ff4f9a'
}];