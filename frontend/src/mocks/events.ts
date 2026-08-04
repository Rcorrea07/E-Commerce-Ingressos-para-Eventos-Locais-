export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  image?: string;
  description?: string;
  organizer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export const events: Event[] = [
  {
    id: '1',
    name: 'Neon Nights Festival',
    date: '2025-11-24',
    time: '22:00',
    location: 'São Paulo, SP',
    price: 89.90,
    category: 'Festa',
    image: '/images/Event_1.png',
    description: 'O maior festival de música eletrônica da região, com luzes neon, DJs internacionais e uma vibe única. Venha dançar até o amanhecer!',
    organizer: {
      name: 'Neon Produções',
      email: 'contato@neonproducoes.com',
      phone: '(11) 99999-9999',
    },
  },
  {
    id: '2',
    name: 'Sunset Beach Party',
    date: '2025-11-25',
    time: '16:00',
    location: 'Rio de Janeiro, RJ',
    price: 59.90,
    category: 'Festa',
    image: '/images/Event_2.png',
    description: 'Uma tarde de sol, areia e boa música na praia mais famosa do Rio. Venha curtir o pôr do sol com DJs e música ao vivo.',
    organizer: {
      name: 'Sunset Produções',
      email: 'contato@sunsetproducoes.com',
    },
  },

];