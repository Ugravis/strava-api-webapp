import { notFound } from "next/navigation";

/** Any unknown address, answered by the not-found page of its language, in the frame of the site. */
export default function UnknownPage() {
  notFound();
}
