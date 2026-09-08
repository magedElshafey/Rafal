import { cn } from "@/lib/utils";

type PageIntroProps = {
  className?: string;
  description?: string;
  title: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function PageIntro({
  className,
  description = "",
  title,
  titleClassName = "",
  descriptionClassName = "",
}: PageIntroProps) {
  return (
    <header className={cn("text-center", className)}>
      <h1
        className={cn(
          "text-h1 font-bold text-gray-1000 md:text-display",
          titleClassName,
        )}
      >
        {title}
      </h1>
      <p
        className={cn(
          "mx-auto mt-3 max-w-2xl type-body-lg text-gray-500",
          descriptionClassName,
        )}
      >
        {description}
      </p>
    </header>
  );
}
