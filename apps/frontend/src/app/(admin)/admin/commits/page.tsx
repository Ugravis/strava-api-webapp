import { pageOf, param } from "@/lib/admin/url";
import { CommitsList } from "./commits-bits";

/** History of `main` from GitHub, by pages of 30 commits. */
export default async function AdminCommitsPage({ searchParams }: PageProps<"/admin/commits">) {
  return <CommitsList page={pageOf(param(await searchParams, "page"))} />;
}
