import Image from "next/image";
import type { AboutUsFeature } from "@/features/about/types/about-us.types";

export default function WhyusCard({ feature }: { feature: AboutUsFeature }) {
  return (
    <article className="rounded-[12px] bg-gray-0 px-3 py-4 text-center space-y-2">
      {feature.iconUrl ? (
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#F2E0BF]">
          <Image src={feature.iconUrl} alt="" width={22} height={22} className="size-[22px] object-contain" />
        </span>
      ) : null}
      {feature.title ? <h3 className="whitespace-pre-line break-words type-body font-bold text-foreground">{feature.title}</h3> : null}
      {feature.subtitle ? <p className="whitespace-pre-line break-words type-body-sm text-[#666666]">{feature.subtitle}</p> : null}
    </article>
  );
}
