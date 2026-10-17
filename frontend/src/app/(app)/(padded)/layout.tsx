/** Pages laid out with margins, unlike the map which fills the space beside the sidebar. */
export default function PaddedLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>;
}
