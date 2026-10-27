/** Pages of the back office, with the panel of a user opened above any of them. */
export default function AdminSectionLayout({ children, panel }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      {panel}
    </>
  );
}
