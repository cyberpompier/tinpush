
import { Profile } from './types';

export const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Amélie',
    age: 26,
    bio: 'Passionnée de randonnée et de photographie. Je cherche quelqu\'un pour explorer les Alpes ou simplement boire un bon café.',
    images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80'],
    interests: ['Nature', 'Photo', 'Café', 'Randonnée'],
    location: 'Lyon',
    job: 'Photographe'
  },
  {
    id: '2',
    name: 'Julien',
    age: 29,
    bio: 'Développeur le jour, guitariste la nuit. J\'adore cuisiner des plats italiens et découvrir de nouveaux bars à vin.',
    images: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80'],
    interests: ['Musique', 'Tech', 'Cuisine', 'Vin'],
    location: 'Paris',
    job: 'Software Engineer'
  },
  {
    id: '3',
    name: 'Léa',
    age: 24,
    bio: 'Étudiante en design. Un peu geek, beaucoup rêveuse. J\'aime les musées, les jeux de société et les couchers de soleil.',
    images: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80'],
    interests: ['Art', 'Gaming', 'Design', 'Voyage'],
    location: 'Bordeaux',
    job: 'Designer UI/UX'
  },
  {
    id: '4',
    name: 'Thomas',
    age: 31,
    bio: 'Entrepreneur toujours en mouvement. Fan de crossfit et de lecture. On discute autour d\'un matcha ?',
    images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'],
    interests: ['Sport', 'Business', 'Lecture', 'Bien-être'],
    location: 'Nantes',
    job: 'Fondateur Start-up'
  },
  {
    id: '5',
    name: 'Chloé',
    age: 27,
    bio: 'Architecte d\'intérieur passionnée par le minimalisme. J\'aime le yoga, le jardinage urbain et les chats.',
    images: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'],
    interests: ['Déco', 'Yoga', 'Animaux', 'Sérénité'],
    location: 'Toulouse',
    job: 'Architecte'
  },
  {
    id: '6',
    name: 'Sofia',
    age: 25,
    bio: 'Danseuse salsa et amoureuse de la cuisine épicée. Toujours partante pour une aventure spontanée.',
    images: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'],
    interests: ['Danse', 'Voyage', 'Cuisine', 'Fête'],
    location: 'Marseille',
    job: 'Prof de Danse'
  },
  {
    id: '7',
    name: 'Lucas',
    age: 28,
    bio: 'Passionné d\'astronomie et de science-fiction. Je passe mes nuits à regarder les étoiles.',
    images: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80'],
    interests: ['Science', 'Lecture', 'Cinéma', 'Tech'],
    location: 'Lille',
    job: 'Chercheur'
  },
  {
    id: '8',
    name: 'Emma',
    age: 23,
    bio: 'Barista et illustratrice. Je dessine les gens dans le métro. Fan de thé vert et de chats.',
    images: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80'],
    interests: ['Art', 'Café', 'Animaux', 'Mode'],
    location: 'Strasbourg',
    job: 'Illustratrice'
  }
];

export const APP_PRIMARY_COLOR = '#F43F5E'; // rose-500
