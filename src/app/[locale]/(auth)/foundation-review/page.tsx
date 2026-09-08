"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog, InfoDialog } from "@/components/ui/rafal-modal";
import { rafalToast } from "@/lib/rafal-toast";

export default function FoundationReviewPage() {
  const [dialog, setDialog] = useState<"info" | "confirm" | null>(null);

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => setDialog("info")}>Info</Button>
      <Button onClick={() => setDialog("confirm")}>Confirm</Button>
      <Button onClick={() => rafalToast.success("تم إضافة المنتج للسلة")}>Success</Button>
      <Button onClick={() => rafalToast.error("حدث خطأ، حاول مرة أخرى")}>Error</Button>
      <Button onClick={() => rafalToast.info("جاري تحديث الطلب")}>Toast info</Button>
      <InfoDialog
        open={dialog === "info"}
        onOpenChange={(open) => setDialog(open ? "info" : null)}
        title="معلومة"
        description="تم تحديث حالة طلبك بنجاح."
        actionLabel="حسنًا"
      />
      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="تأكيد الطلب"
        description="هل أنت متأكد من إتمام هذا الإجراء؟"
        confirmLabel="تأكيد"
        cancelLabel="إلغاء"
        onConfirm={() => setDialog(null)}
      />
    </div>
  );
}
