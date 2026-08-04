import { CheckoutExperience } from "@/components/checkout/CheckoutExperience";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CheckoutExperience checkoutId={id} />;
}
