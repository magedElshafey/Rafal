"use client";

import { useState, type ComponentProps } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type AnnouncementBannerProps = ComponentProps<"aside"> & {
  message: string;
  dismissible?: boolean;
};

const AnnouncementBanner = ({
  message,
  dismissible = false,
  className,
  ...props
}: AnnouncementBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      {...props}
      className={cn(
        "relative flex h-11 w-full items-center justify-center bg-accent px-12",
        className,
      )}
    >
      <p className="type-body-sm text-gold-600 font-medium">{message}</p>

      {dismissible && (
        <IconButton
          type="button"
          variant="ghost"
          size="md"
          aria-label="إغلاق شريط الإعلان"
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground cursor-pointer duration-300 hover:scale-105"
        >
          <XIcon />
        </IconButton>
      )}
    </aside>
  );
};

export default AnnouncementBanner;
