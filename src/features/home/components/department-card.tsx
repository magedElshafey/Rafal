import Image from "next/image";

import { Link } from "@/i18n/navigation";

type DepartmentCardProps = {
  href: string;
  imageAlt: string;
  imageUrl: string;
  title: string;
};

export function DepartmentCard({
  href,
  imageAlt,
  imageUrl,
  title,
}: DepartmentCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-gray-100">
        <Image
          fill
          alt={imageAlt}
          className="object-cover transition-transform group-hover:scale-[1.02] motion-reduce:transition-none"
          sizes="(max-width: 479px) 60vw, (max-width: 767px) 42vw, (max-width: 1023px) 28vw, 16vw"
          src={imageUrl}
        />
      </span>
      <span className="mt-2 block text-center type-body font-medium text-foreground">
        {title}
      </span>
    </Link>
  );
}
