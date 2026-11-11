"use client";
import { useParams } from "next/navigation";
import ConversationThread from "../../../components/ConversationThread";
export default function CreatorThreadPage() {
  const { id } = useParams();
  return <ConversationThread applicationId={id} backHref="/inbox" />;
}
