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
  organization?: string;
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
    description: 'Prepare-se para uma experiência imersiva repleta de luzes neon, DJs renomados e muita energia. O festival reúne o melhor da música eletrônica em uma estrutura épica e futurista. Venha viver uma noite inesquecível com efeitos visuais surpreendentes.',
    organization: 'Neon Group',
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
    description: 'Celebre o pôr do sol à beira-mar com o melhor do house music, drinks exclusivos e um clima paradisíaco. Uma festa pé na areia pensada para quem quer curtir a energia do litoral. Aproveite a vibe única e venha conectar-se com boas vibrações.',
    organization: 'Samba da praia',
    organizer: {
      name: 'Sunset Produções',
      email: 'contato@sunsetproducoes.com',
    },
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
    description: 'Uma noite intimista com performances marcantes dos melhores músicos de jazz e blues da região. Desfrute de um ambiente aconchegante acompanhado de uma cartela de vinhos e petiscos especiais. O refúgio perfeito para os amantes de boa música e sofisticação.',
    organization: 'Fantasmas do Jazz',
  },
  {
    id: '4',
    name: 'Tech Conference 2025',
    date: '2025-12-01',
    time: '09:00',
    location: 'Curitiba, PR',
    price: 199.00,
    category: 'Negócios',
    description: 'O maior encontro de tecnologia e inovação do ano reunindo os principais nomes do mercado digital. Participe de palestras inspiradoras, workshops práticos e amplie sua rede de contatos. Fique por dentro das maiores tendências em IA, programação e negócios.',
    organization: 'Instituto Nacional de Telecomunicações, INATEL',
  },
  {
    id: '5',
    name: 'Feira de Artesanato',
    date: '2025-12-05',
    time: '10:00',
    location: 'Salvador, BA',
    price: 0.00,
    category: 'Cultural',
    description: 'Explore a riqueza da cultura local através de peças únicas feitas à mão por artesãos talentosos. O evento conta com exposições, oficinas gratuitas e barracas de comidas típicas maravilhosas. Um passeio perfeito e enriquecedor para toda a família.',
    organization: 'Artistas sem fronteiras',
  },
];

// descrições feitas com ia
