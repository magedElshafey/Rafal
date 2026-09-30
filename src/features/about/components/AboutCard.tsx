type AboutCardProps = {
  title: string;
  description: string;
};

const AboutCard = ({ title, description }: AboutCardProps) => {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-0 p-6">
      <h2 className="text-h3 font-bold text-success">{title}</h2>
      <p className="mt-2 whitespace-pre-line break-words type-body text-gray-500">{description}</p>
    </article>
  );
};

export default AboutCard;
