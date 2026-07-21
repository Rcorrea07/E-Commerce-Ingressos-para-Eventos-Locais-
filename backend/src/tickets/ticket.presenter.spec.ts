import { describe, expect, it } from 'vitest';
import { serializeOrder } from './ticket.presenter.js';

describe('safe order presenter', () => {
  it('omits customer address and private snapshots', () => {
    const response = serializeOrder({
      id: 'order-id', publicId: 'ORD-1', status: 'CONFIRMED', totalCents: 1000, currency: 'BRL', eventId: 'event-id',
      eventTitle: 'Evento', eventStartsAt: new Date(), event: { slug: 'evento' }, createdAt: new Date(), cancelledAt: null,
      customerSnapshot: { street: 'Rua privada' }, customerCpfLast4: '4725', customerEmail: 'cliente@test.local', items: []
    });

    expect(response).not.toHaveProperty('customerSnapshot');
    expect(response).not.toHaveProperty('customerCpfLast4');
    expect(response).not.toHaveProperty('customerEmail');
  });
});
