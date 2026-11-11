"use client";
import { useParams } from "next/navigation";
import ConversationThread from "../../../../components/ConversationThread";
export default function HotelThreadPage() {
  const { id } = useParams();
  return <ConversationThread applicationId={id} backHref="/hotel/inbox" />;
}
