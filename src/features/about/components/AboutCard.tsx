type AboutCardProps = {
  title: string;
  description: string;
};

const AboutCard = ({ title, description }: AboutCardProps) => {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-0 p-6">
      <h3 className="text-h3 font-bold text-success">{title}</h3>
      <p className="mt-2 type-body text-gray-500">{description}</p>
    </article>
  );
};

export default AboutCard;
