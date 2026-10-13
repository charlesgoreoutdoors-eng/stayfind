import { redirect } from "next/navigation";

// Hotel home → profile (the only page for now).
export default function HotelHome() {
  redirect("/hotel/profile");
}
