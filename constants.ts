
import { Profile } from './types';

export const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Amélie',
    age: 26,
    bio: 'Passionnée de randonnée et de photographie. Je cherche quelqu\'un pour explorer les Alpes ou simplement boire un bon café.',
    images: ['https://picsum.photos/seed/amelie/600/800'],
    interests: ['Nature', 'Photo', 'Café', 'Randonnée'],
    location: 'Lyon',
    job: 'Photographe'
  },
  {
    id: '2',
    name: 'Julien',
    age: 29,
    bio: 'Développeur le jour, guitariste la nuit. J\'adore cuisiner des plats italiens et découvrir de nouveaux bars à vin.',
    images: ['https://picsum.photos/seed/julien/600/800'],
    interests: ['Musique', 'Tech', 'Cuisine', 'Vin'],
    location: 'Paris',
    job: 'Software Engineer'
  },
  {
    id: '3',
    name: 'Léa',
    age: 24,
    bio: 'Étudiante en design. Un peu geek, beaucoup rêveuse. J\'aime les musées, les jeux de société et les couchers de soleil.',
    images: ['https://picsum.photos/seed/lea/600/800'],
    interests: ['Art', 'Gaming', 'Design', 'Voyage'],
    location: 'Bordeaux',
    job: 'Designer UI/UX'
  },
  {
    id: '4',
    name: 'Thomas',
    age: 31,
    bio: 'Entrepreneur toujours en mouvement. Fan de crossfit et de lecture. On discute autour d\'un matcha ?',
    images: ['https://picsum.photos/seed/thomas/600/800'],
    interests: ['Sport', 'Business', 'Lecture', 'Bien-être'],
    location: 'Nantes',
    job: 'Fondateur Start-up'
  },
  {
    id: '5',
    name: 'Chloé',
    age: 27,
    bio: 'Architecte d\'intérieur passionnée par le minimalisme. J\'aime le yoga, le jardinage urbain et les chats.',
    images: ['https://picsum.photos/seed/chloe/600/800'],
    interests: ['Déco', 'Yoga', 'Animaux', 'Sérénité'],
    location: 'Toulouse',
    job: 'Architecte'
  }
];

export const APP_PRIMARY_COLOR = '#F43F5E'; // rose-500
