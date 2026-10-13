import HotelSidebar from "../../components/HotelSidebar";

// The hotel site is a separate shell. Auth/providers come from the root layout;
// this just swaps in the hotel sidebar for everything under /hotel/*.
export default function HotelLayout({ children }) {
  return <HotelSidebar>{children}</HotelSidebar>;
}
