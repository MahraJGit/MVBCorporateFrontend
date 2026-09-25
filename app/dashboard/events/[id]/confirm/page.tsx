import { redirect } from "next/navigation";

export default async function ConfirmBookingsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/events/${id}/reserve`);
}
