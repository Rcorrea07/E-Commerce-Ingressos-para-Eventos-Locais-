import { Suspense } from "react";
import { OrderDetails } from "@/components/orders/OrderDetails";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Suspense><OrderDetails orderId={id} /></Suspense>; }
