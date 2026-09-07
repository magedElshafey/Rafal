import AppLink from "@/components/shell/storefront/header/AppLink";

export type AppLinks = { title: string; path: string };
const links: AppLinks[] = [
  {
    title: "home",
    path: "/",
  },
  {
    title: "categories",
    path: "/categories",
  },
  {
    title: "offers",
    path: "/offers",
  },
  {
    title: "about_us",
    path: "/about-us",
  },
  {
    title: "blogs",
    path: "/blogs",
  },
];
const ListLinks = () => {
  return (
    <ul className="flex items-center gap-3">
      {links?.map((link, index) => (
        <AppLink key={index} item={link} />
      ))}
    </ul>
  );
};

export default ListLinks;
