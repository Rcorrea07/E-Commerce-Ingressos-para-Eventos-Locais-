import type { Checkout, Order, StaffInvitation, Ticket, UserRole } from "@/lib/api/types";

export const roleLabels: Record<UserRole, string> = {
  customer: "Cliente",
  organizer: "Produtor",
  gate_staff: "Portaria",
  admin: "Admin",
};

export const orderStatusLabels: Record<Order["status"], string> = {
  CONFIRMED: "Confirmado",
  CANCELLED_BY_CUSTOMER: "Cancelado pelo cliente",
  CANCELLED_BY_EVENT: "Cancelado pelo evento",
};

export const ticketStatusLabels: Record<Ticket["status"], string> = {
  ISSUED: "Emitido",
  USED: "Utilizado",
  CANCELLED: "Cancelado",
};

export const ticketCustomerStatusLabels: Record<Ticket["status"], string> = {
  ISSUED: "Válido",
  USED: "Utilizado",
  CANCELLED: "Cancelado",
};

export const checkoutStatusLabels: Record<Checkout["status"], string> = {
  ACTIVE: "Ativa",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
  ABANDONED: "Abandonada",
};

export const invitationStatusLabels: Record<StaffInvitation["status"], string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceito",
  REVOKED: "Revogado",
  EXPIRED: "Expirado",
};

export function roleLabel(role: string) {
  return roleLabels[role as UserRole] ?? role;
}

export function orderStatusLabel(status: string) {
  return orderStatusLabels[status as Order["status"]] ?? status;
}

export function ticketStatusLabel(status: string) {
  return ticketStatusLabels[status as Ticket["status"]] ?? status;
}
