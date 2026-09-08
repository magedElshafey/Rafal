import { RatingStarIcon } from "@/components/ui/icons";

type StoreRateProps = {
  title: string;
  label: string;
  description: string;
  rate: number;
};

const StoreRate = ({ title, label, description, rate }: StoreRateProps) => {
  return (
    <section
      aria-labelledby="rating-title"
      className="mt-8 rounded-lg bg-gold-50 p-7 text-center md:mt-10"
    >
      <h2 id="rating-title" className=" text-foreground type-body-lg font-bold">
        {title}
      </h2>
      <div
        className="mt-2.5 flex justify-center gap-1 text-warning"
        aria-label={label}
      >
        {Array.from({ length: rate }, (_, index) => (
          <RatingStarIcon key={index} size={22} />
        ))}
      </div>
      <p className="mt-2.5 text-xs text-gray-500">{description}</p>
    </section>
  );
};

export default StoreRate;
