export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  image?: string;
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
  },
  {
    id: '3',
    name: 'Jazz & Blues Club',
    date: '2025-11-26',
    time: '20:00',
    location: 'Belo Horizonte, MG',
    price: 45.00,
    category: 'Música',
    image: '/images/Event_3.png',
  },
  {
    id: '4',
    name: 'Tech Conference 2025',
    date: '2025-12-01',
    time: '09:00',
    location: 'Curitiba, PR',
    price: 199.00,
    category: 'Negócios',
  },
  {
    id: '5',
    name: 'Feira de Artesanato',
    date: '2025-12-05',
    time: '10:00',
    location: 'Salvador, BA',
    price: 0.00,
    category: 'Cultural',
  },
];