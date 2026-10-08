import { Suspense } from "react";
import MailChannel from "../components/MailChannel";

export default function MailPage() {
  return <Suspense fallback={null}><MailChannel /></Suspense>;
}
