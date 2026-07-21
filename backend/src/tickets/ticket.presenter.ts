export function serializeOrder(order: any) {
  return {
    id: order.id,
    publicId: order.publicId,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    event: {
      id: order.eventId,
      title: order.eventTitle,
      startsAt: order.eventStartsAt,
      ...(order.event?.slug ? { slug: order.event.slug } : {})
    },
    items: order.items.map((item: any) => ({
      id: item.id,
      ticketTypeId: item.ticketTypeId,
      ticketTypeName: item.ticketTypeName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      tickets: item.tickets.map((ticket: any) => ({
        id: ticket.id,
        publicId: ticket.publicId,
        status: ticket.status,
        unitSequence: ticket.unitSequence,
        createdAt: ticket.createdAt,
        validatedAt: ticket.validatedAt
      }))
    })),
    createdAt: order.createdAt,
    cancelledAt: order.cancelledAt
  };
}

export function serializeTicket(ticket: any, qrPayload: string) {
  return {
    id: ticket.id,
    publicId: ticket.publicId,
    status: ticket.status,
    unitSequence: ticket.unitSequence,
    createdAt: ticket.createdAt,
    validatedAt: ticket.validatedAt,
    event: {
      id: ticket.event.id,
      title: ticket.event.title,
      slug: ticket.event.slug,
      startsAt: ticket.event.startsAt,
      venueName: ticket.event.venueName,
      city: ticket.event.city,
      state: ticket.event.state
    },
    ticketType: {
      id: ticket.ticketTypeId,
      name: ticket.orderItem.ticketTypeName
    },
    orderPublicId: ticket.orderItem.order.publicId,
    qrPayload
  };
}
