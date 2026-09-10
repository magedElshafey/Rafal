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
      <h1 className={cn("text-2xl font-bold text-foreground", titleClassName)}>
        {title}
      </h1>
      <p
        className={cn(
          "mt-3 max-w-2xl type-body-lg text-gray-500",
          descriptionClassName,
        )}
      >
        {description}
      </p>
    </header>
  );
}
