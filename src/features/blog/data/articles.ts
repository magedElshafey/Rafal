import type { Locale } from "next-intl";

import type { BlogArticle, LocalizedBlogArticle } from "../types";

const sharedContent = {
  ar: [
    "عندما نفكر في الهدايا المثالية للمناسبات العائلية، فإن اللمسة الشخصية هي ما يحوّل هدية عادية إلى ذكرى تدوم. في رافال، نؤمن أن كل قطعة تحمل اسماً أو نقشاً خاصاً تصبح جزءاً من قصة العائلة، لا مجرد إكسسوار.",
    "أولاً، السلاسل والأساور المنقوشة بالاسم تُعد من أكثر الهدايا رواجاً، فهي تناسب جميع الأعمار والمناسبات — من أعياد الميلاد إلى التخرج. يمكنك اختيار خط النقش ولون المعدن بما يعكس شخصية المُهدى إليه.",
    "ثانياً، المباخر الشخصية بنقش اسم العائلة تحمل معنى خاصاً في البيوت السعودية، وتعد هدية مثالية لمنزل جديد أو مناسبة عائلية كبيرة.",
    "وأخيراً، لا تنسَ إضافة بطاقة تهنئة مخصصة مع طلبك — فالتفاصيل الصغيرة هي ما يجعل الهدية لا تُنسى.",
  ],
  en: [
    "The personal touch transforms an everyday gift into a lasting memory. At Rafal, we believe every piece bearing a name or special engraving becomes part of a family story, not merely an accessory.",
    "Engraved necklaces and bracelets are among the most versatile gifts. They suit every age and occasion, from birthdays to graduation, with a choice of lettering and metal finish that reflects the recipient.",
    "Personalized home pieces bearing a family name also carry special meaning and make thoughtful gifts for a new home or a major family celebration.",
    "Finally, add a personalized greeting card to your order. The smallest details are often what make a gift unforgettable.",
  ],
} as const;

export const blogArticles: readonly BlogArticle[] = [
  {
    id: "family-occasions",
    slug: "personalized-gifts-for-family-occasions",
    title: { ar: "٥ أفكار لهدايا مخصصة تُخلّد المناسبات العائلية", en: "5 personalized gifts for family occasions" },
    excerpt: { ar: "من السلاسل المنقوشة بالاسم إلى المباخر الشخصية — اكتشفي كيف تختارين هدية تحمل معنى خاصاً لكل مناسبة.", en: "From engraved necklaces to personal keepsakes, discover how to choose a meaningful gift for every occasion." },
    content: sharedContent,
    category: { ar: "دليل الهدايا", en: "Gift guide" },
    publishedAt: "2026-08-10",
    readingTime: 4,
    image: { src: null, alt: { ar: "قلادة فضية مخصصة بالاسم", en: "A personalized silver name necklace" } },
    featured: true,
  },
  {
    id: "rafal-story",
    slug: "from-an-idea-to-a-brand",
    title: { ar: "قصة رافال: من فكرة إلى علامة", en: "The Rafal story: from an idea to a brand" },
    excerpt: { ar: "رحلتنا في صناعة الإكسسوارات المخصصة بلمسة سعودية أصيلة.", en: "Our journey creating personalized accessories with an authentic Saudi touch." },
    content: sharedContent,
    category: { ar: "من نحن", en: "Our story" },
    publishedAt: "2026-07-30",
    readingTime: 3,
    image: { src: null, alt: { ar: "قطعة مجوهرات مخصصة من رافال", en: "A personalized Rafal jewelry piece" } },
  },
  {
    id: "graduation-gifts",
    slug: "memorable-graduation-gifts",
    title: { ar: "أفكار هدايا تخرج لا تُنسى", en: "Memorable graduation gift ideas" },
    excerpt: { ar: "مجموعة مختارة من القطع المثالية للاحتفال بإنجاز أحبائك.", en: "A curated collection of pieces to celebrate your loved ones' achievements." },
    content: sharedContent,
    category: { ar: "دليل الهدايا", en: "Gift guide" },
    publishedAt: "2026-07-28",
    readingTime: 3,
    image: { src: null, alt: { ar: "هدية تخرج مخصصة", en: "A personalized graduation gift" } },
  },
  {
    id: "choose-engraving",
    slug: "how-to-choose-your-engraving",
    title: { ar: "كيف تختارين نقشاً يليق باسمك؟", en: "How to choose an engraving that suits you" },
    excerpt: { ar: "دليلك الكامل لاختيار الخط والتصميم المناسب لقطعتك المخصصة.", en: "Your complete guide to choosing the right lettering and design." },
    content: sharedContent,
    category: { ar: "التخصيص", en: "Personalization" },
    publishedAt: "2026-07-20",
    readingTime: 5,
    image: { src: null, alt: { ar: "تفاصيل نقش على قلادة", en: "Engraving details on a necklace" } },
  },
  {
    id: "car-accessories",
    slug: "personalized-car-accessories",
    title: { ar: "إكسسوارات السيارات: أناقة بلمسة شخصية", en: "Car accessories with a personal touch" },
    excerpt: { ar: "تعرّف على مجموعتنا من إكسسوارات السيارات القابلة للتخصيص.", en: "Explore our collection of customizable car accessories." },
    content: sharedContent,
    category: { ar: "منتجات", en: "Products" },
    publishedAt: "2026-07-18",
    readingTime: 3,
    image: { src: null, alt: { ar: "إكسسوار سيارة مخصص", en: "A personalized car accessory" } },
  },
  {
    id: "ramadan-gifts",
    slug: "personalized-ramadan-gifts",
    title: { ar: "هدايا مناسبة لشهر رمضان", en: "Personalized gifts for Ramadan" },
    excerpt: { ar: "اخترنا لك أفضل القطع المخصصة لتكون هدية رمضانية مميزة.", en: "Our favorite personalized pieces for a memorable Ramadan gift." },
    content: sharedContent,
    category: { ar: "دليل الهدايا", en: "Gift guide" },
    publishedAt: "2026-07-05",
    readingTime: 4,
    image: { src: null, alt: { ar: "هدية رمضانية مخصصة", en: "A personalized Ramadan gift" } },
  },
  {
    id: "silver-care",
    slug: "how-to-care-for-silver-jewelry",
    title: { ar: "كيف تعتنين بمجوهراتك الفضية؟", en: "How to care for silver jewelry" },
    excerpt: { ar: "نصائح بسيطة للحفاظ على بريق قطعك المفضلة لأطول فترة.", en: "Simple tips that keep your favorite pieces shining for longer." },
    content: sharedContent,
    category: { ar: "العناية بالمنتج", en: "Product care" },
    publishedAt: "2026-07-03",
    readingTime: 4,
    image: { src: null, alt: { ar: "مجوهرات فضية لامعة", en: "Polished silver jewelry" } },
  },
] as const;

export function getLocalizedArticles(locale: Locale): LocalizedBlogArticle[] {
  return blogArticles.map((article) => ({
    ...article,
    category: article.category[locale],
    content: article.content[locale],
    excerpt: article.excerpt[locale],
    image: { src: article.image.src, alt: article.image.alt[locale] },
    title: article.title[locale],
  }));
}

export function getLocalizedArticle(locale: Locale, slug: string) {
  return getLocalizedArticles(locale).find((article) => article.slug === slug);
}
