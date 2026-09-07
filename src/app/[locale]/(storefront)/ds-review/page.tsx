import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { HeartIcon, SaudiFlagIcon, SearchIcon } from "@/components/ui/icons";
import { InputField, PhoneInputField } from "@/components/ui/input";
import { ProductCard } from "@/features/products/components/product-card";

export default function DesignSystemReviewPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-1000" dir="rtl">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <section className="flex flex-wrap items-center gap-4">
          <Button>أساسي</Button>
          <Button variant="secondary">ثانوي</Button>
          <Button variant="outline">إطار</Button>
          <Button variant="ghost">نصي</Button>
          <Button disabled>معطل</Button>
          <Button loading loadingLabel="جار التحميل">
            جار التحميل
          </Button>
        </section>
        <section className="flex flex-wrap items-center gap-6">
          <IconButton aria-label="بحث" size="sm">
            <SearchIcon />
          </IconButton>
          <IconButton aria-label="بحث" size="md" variant="outline">
            <SearchIcon />
          </IconButton>
          <IconButton aria-label="المفضلة" size="lg" variant="ghost">
            <HeartIcon />
          </IconButton>
        </section>
        <section className="grid max-w-xl grid-cols-2 gap-6">
          <InputField
            id="review-default"
            label="الاسم"
            placeholder="أدخل الاسم"
          />
          <InputField
            id="review-error"
            label="البريد الإلكتروني"
            defaultValue="name@example.com"
            error="تحقق من البريد الإلكتروني"
          />
          <InputField
            id="review-disabled"
            label="الاسم"
            disabled
            placeholder="أدخل الاسم"
          />
          <PhoneInputField
            id="review-phone"
            label="رقم الجوال"
            countryCode="+966"
            countryFlag={<SaudiFlagIcon className="size-full" />}
            placeholder="5X XXX XXXX"
          />
        </section>
        <section className="flex flex-wrap gap-3">
          <Badge variant="discount">خصم 20٪</Badge>
          <Badge variant="new">جديد</Badge>
          <Badge variant="personalization">قابل للتخصيص</Badge>
          <Badge variant="unavailable">غير متوفر</Badge>
        </section>
        <section className="flex flex-wrap gap-6">
          <ProductCard
            title="حقيبة رفال المميزة"
            image="/ds-product-preview.svg"
            imageAlt="حقيبة رفال ذهبية"
            imageSizes="170px"
            price="149 ر.س"
            rating={{ value: 4.5, label: "4.5 من 5 نجوم" }}
            badge={{ variant: "personalization", label: "قابل للتخصيص" }}
            wishlistAction={{ label: "أضف إلى المفضلة" }}
            className="w-[var(--product-card-width)]"
          />
          <ProductCard
            title="حقيبة رفال المخفضة"
            image="/ds-product-preview.svg"
            imageAlt="حقيبة رفال ذهبية"
            imageSizes="170px"
            price="119 ر.س"
            originalPrice="149 ر.س"
            rating={{ value: 4, label: "4 من 5 نجوم" }}
            badge={{ variant: "discount", label: "خصم 20٪" }}
            wishlistAction={{ label: "أضف إلى المفضلة" }}
            quickAddAction={{ label: "أضف إلى السلة" }}
            className="w-[var(--product-card-width)]"
          />
        </section>
      </div>
    </main>
  );
}
