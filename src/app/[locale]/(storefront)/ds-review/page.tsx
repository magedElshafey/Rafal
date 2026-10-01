import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { HeartIcon, SaudiFlagIcon, SearchIcon } from "@/components/ui/icons";
import { Input, InputField, PhoneInputField } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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
        <section aria-labelledby="review-forms-title" className="space-y-6">
          <h2 id="review-forms-title" className="text-h3">حقول النماذج — بساطة راقية</h2>
          <p className="type-body text-gray-600">استخدم لوحة المفاتيح لفحص التركيز. قوائم الاختيار تستخدم واجهة المتصفح الأصلية.</p>
          <fieldset>
            <legend className="mb-4 text-h4">الإدخال</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              <InputField id="review-default" label="افتراضي" />
              <InputField id="review-placeholder" label="نص توضيحي" placeholder="أدخل الاسم" />
              <InputField id="review-filled" label="معبأ" defaultValue="رفال" />
              <InputField id="review-disabled" label="معطل" disabled defaultValue="رفال" />
              <InputField id="review-readonly" label="للقراءة فقط" readOnly defaultValue="رفال" helperText="يمكن تحديد النص ونسخه." />
              <InputField id="review-error" label="مطلوب — مثال خطأ" required defaultValue="" error="يرجى إدخال الاسم." />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-4 text-h4">نص متعدد الأسطر</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { key: "default", label: "افتراضي", placeholder: "اكتب رسالتك" },
                { key: "filled", label: "معبأ", defaultValue: "هدية مميزة من رفال." },
                { key: "disabled", label: "معطل", defaultValue: "هدية مميزة من رفال.", disabled: true },
                { key: "readonly", label: "للقراءة فقط", defaultValue: "يمكن تحديد هذه الرسالة ونسخها.", readOnly: true },
                { key: "invalid", label: "مطلوب — مثال خطأ", invalid: true, required: true },
              ].map(({ key, label, invalid, ...props }) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`review-textarea-${key}`}>{label}</FieldLabel>
                  <Textarea id={`review-textarea-${key}`} rows={3} invalid={invalid} aria-describedby={invalid ? "review-textarea-error" : undefined} {...props} />
                  {invalid ? <FieldError id="review-textarea-error">يرجى كتابة الرسالة.</FieldError> : null}
                </Field>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-4 text-h4">اختيار أصلي</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { key: "selected", label: "قيمة محددة", defaultValue: "newest" },
                { key: "placeholder", label: "اختر قيمة", defaultValue: "" },
                { key: "disabled", label: "معطل", defaultValue: "newest", disabled: true },
                { key: "invalid", label: "مطلوب — مثال خطأ", defaultValue: "", invalid: true, required: true },
              ].map(({ key, label, invalid, ...props }) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`review-select-${key}`}>{label}</FieldLabel>
                  <NativeSelect id={`review-select-${key}`} invalid={invalid} aria-describedby={invalid ? "review-select-error" : undefined} {...props}>
                    <option value="" disabled>اختر الترتيب</option>
                    <option value="newest">الأحدث</option>
                    <option value="price_asc">السعر من الأقل إلى الأعلى</option>
                    <option value="price_desc">السعر من الأعلى إلى الأقل</option>
                  </NativeSelect>
                  {invalid ? <FieldError id="review-select-error">يرجى اختيار الترتيب.</FieldError> : null}
                </Field>
              ))}
            </div>
          </fieldset>
          <Field>
            <FieldLabel htmlFor="review-composed">تركيب الحقل — تعليمات وعدّاد وخطأ</FieldLabel>
            <Input id="review-composed" invalid defaultValue="نص تجريبي" aria-describedby="review-policy review-count review-composed-error" />
            <FieldDescription id="review-policy">مثال على تعليمات تبقى ظاهرة مع الخطأ.</FieldDescription>
            <FieldDescription id="review-count">العدّاد: مثال وصفي ثابت.</FieldDescription>
            <FieldError id="review-composed-error">مثال على رسالة خطأ مرتبطة بالحقل.</FieldError>
          </Field>
          <Field dir="ltr">
            <FieldLabel htmlFor="review-select-ltr">اختبار اتجاه يسار إلى يمين</FieldLabel>
            <NativeSelect id="review-select-ltr" defaultValue="newest">
              <option value="newest">newest</option>
              <option value="price_asc">price_asc</option>
            </NativeSelect>
          </Field>
          <PhoneInputField id="review-phone" label="رقم الجوال — المكوّن المتخصص الحالي" countryCode="+966" countryFlag={<SaudiFlagIcon className="size-full" />} placeholder="5X XXX XXXX" />
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
            rating={{
              value: 4.5,
              label: "التقييم 4.5 من 5",
              reviewsLabel: "128 تقييم",
            }}
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
            rating={{
              value: 4,
              label: "التقييم 4.0 من 5",
              reviewsLabel: "24 تقييم",
            }}
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
