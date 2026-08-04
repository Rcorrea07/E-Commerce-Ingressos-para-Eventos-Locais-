import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

export type ProblemDetails = Schemas["ProblemDetailsDto"];
export type Profile = Schemas["ProfileResponseDto"];
export type EventListResponse = Schemas["EventListResponseDto"];
export type EventSummary = EventListResponse["data"][number];
export type PublicEvent = Schemas["PublicEventResponseDto"];
export type Category = Schemas["CategoryResponseDto"];
export type Checkout = Schemas["CheckoutResponseDto"];
export type PaymentSession = Schemas["PaymentSessionResponseDto"];
export type Order = Schemas["OrderResponseDto"];
export type Ticket = Schemas["TicketResponseDto"];
export type OrganizerEvent = Schemas["OrganizerEventResponseDto"];
export type Analytics = Schemas["AnalyticsResponseDto"];
export type GateEvent = Schemas["GateEventResponseDto"];
export type GateValidation = Schemas["GateValidationResponseDto"];
export type StaffInvitation = Schemas["StaffInvitationResponseDto"];
export type AdminEvents = Schemas["AdminEventsResponseDto"];
export type AdminEventDetails = Schemas["AdminEventDetailsResponseDto"];
export type AdminOrders = Schemas["AdminOrdersResponseDto"];
export type AdminTickets = Schemas["AdminTicketsResponseDto"];
export type AdminUsers = Schemas["AdminUsersResponseDto"];

export type UserRole = "customer" | "organizer" | "gate_staff" | "admin";

export function rolesFromSession(role?: string | null): UserRole[] {
  const values = (role ?? "customer").split(",").map((value) => value.trim());
  return values.filter((value): value is UserRole =>
    ["customer", "organizer", "gate_staff", "admin"].includes(value),
  );
}
