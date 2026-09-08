import type { ComponentType } from "react";

import type { RafalIconProps } from "@/components/ui/icons";

type WhyusCardProps = {
  title: string;
  description: string;
  Icon: ComponentType<RafalIconProps>;
};

const WhyusCard = ({ title, Icon, description }: WhyusCardProps) => {
  return (
    <article className="rounded-[12px] bg-gray-0 px-3 py-4 text-center space-y-2">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#F2E0BF] text-primary">
        <Icon size={22} />
      </span>
      <h3 className="type-body font-bold text-foreground">{title}</h3>
      <p className="type-body-sm text-[#666666]">{description}</p>
    </article>
  );
};

export default WhyusCard;
