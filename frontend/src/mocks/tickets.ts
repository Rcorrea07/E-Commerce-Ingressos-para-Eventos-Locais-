export interface Ticket {
  id: string;
  eventId: string;
  type: string;
  price: number;
  available: number;
}

export const tickets: Ticket[] = [
  {
    id: 't1',
    eventId: '1',
    type: 'Pista',
    price: 89.90,
    available: 50,
  },
  {
    id: 't2',
    eventId: '1',
    type: 'VIP',
    price: 199.90,
    available: 20,
  },
  {
    id: 't3',
    eventId: '1',
    type: 'Backstage',
    price: 350.00,
    available: 10,
  },
  {
    id: 't4',
    eventId: '2',
    type: 'Pista',
    price: 59.90,
    available: 100,
  },
  {
    id: 't5',
    eventId: '2',
    type: 'Camarote',
    price: 150.00,
    available: 30,
  },
  {
    id: 't6',
    eventId: '3',
    type: 'Entrada',
    price: 45.00,
    available: 80,
  },
  {
    id: 't7',
    eventId: '4',
    type: 'Presencial',
    price: 199.00,
    available: 40,
  },
  {
    id: 't8',
    eventId: '4',
    type: 'Online',
    price: 99.00,
    available: 200,
  },
  {
    id: 't9',
    eventId: '5',
    type: 'Entrada',
    price: 0.00,
    available: 0,
  },
];