import { Link } from "@/i18n/navigation";

const AppLogo = () => {
  return (
    <Link
      href="/"
      aria-label="Rafal - Home"
      className="inline-flex items-center rounded-sm font-bold uppercase text-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-xl xl:text-2xl"
    >
      Rafal
    </Link>
  );
};

export default AppLogo;
