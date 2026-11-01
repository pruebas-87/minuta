import { notFound } from "next/navigation";
import { readMeeting } from "@/lib/store";
import MeetingDetail from "@/components/MeetingDetail";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await readMeeting(id);
  if (!meeting) notFound();
  return <MeetingDetail meeting={meeting} />;
}
