import { listMeetings } from "@/lib/store";
import Workspace from "@/components/Workspace";

export const dynamic = "force-dynamic";

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default async function HomePage() {
  const meetings = await listMeetings();
  return <Workspace recent={meetings.slice(0, 4)} today={localToday()} />;
}
