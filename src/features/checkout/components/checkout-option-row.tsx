import type {
  ComponentPropsWithoutRef,
  ReactElement,
  ReactNode,
} from "react";

import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type NativeRadioProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "checked" | "type"
> & {
  checked: boolean;
  type: "radio";
};

type VisualOnlyOptionState =
  | {
      control?: undefined;
      selected: true;
      selectedLabel: string;
      disabled?: boolean;
    }
  | {
      control?: undefined;
      selected?: false;
      selectedLabel?: never;
      disabled?: boolean;
    };

type NativeRadioOptionState = {
  control: ReactElement<NativeRadioProps>;
  selected?: never;
  selectedLabel?: never;
  disabled?: never;
};

type CheckoutOptionRowProps = (VisualOnlyOptionState | NativeRadioOptionState) & {
  title: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  startContent?: ReactNode;
  endContent?: ReactNode;
  className?: string;
};

export function CheckoutOptionRow({
  className,
  control,
  description,
  disabled = false,
  endContent,
  selected = false,
  selectedLabel,
  startContent,
  title,
  value,
}: CheckoutOptionRowProps) {
  const isSelected = control ? control.props.checked : selected;
  const isDisabled = control ? Boolean(control.props.disabled) : disabled;
  const rowClassName = cn(
    "relative flex min-h-16 w-full items-center gap-3 rounded-md border border-gray-200 bg-gray-0 px-4 py-3",
    isSelected &&
      "border-[length:var(--border-width-emphasis)] border-gold-500 bg-gold-50",
    isDisabled && "bg-gray-50 text-gray-400 opacity-60",
    control &&
      "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
    control && (isDisabled ? "cursor-not-allowed" : "cursor-pointer"),
    className,
  );
  const content = (
    <>
      {control ? <span className="sr-only">{control}</span> : null}
      {isSelected ? (
        <span
          aria-hidden={control ? "true" : undefined}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-500 text-gray-0"
        >
          <CheckIcon aria-hidden="true" className="size-3" />
          {control ? null : <span className="sr-only">{selectedLabel}</span>}
        </span>
      ) : null}
      {startContent ? (
        <span className="flex shrink-0 items-center">{startContent}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block type-body font-medium text-gray-1000",
            isDisabled && "text-gray-400",
          )}
        >
          {title}
        </span>
        {description ? (
          <span className="mt-1 block type-body-sm text-gray-500">
            {description}
          </span>
        ) : null}
      </span>
      {value ? (
        <span
          className={cn(
            "shrink-0 type-body font-medium text-gray-1000",
            isDisabled && "text-gray-400",
          )}
        >
          {value}
        </span>
      ) : null}
      {endContent ? (
        <span className="flex shrink-0 items-center">{endContent}</span>
      ) : null}
    </>
  );

  if (control) {
    return (
      <label
        data-state={isSelected ? "selected" : "default"}
        className={rowClassName}
      >
        {content}
      </label>
    );
  }

  return (
    <div
      aria-disabled={isDisabled || undefined}
      data-state={isSelected ? "selected" : "default"}
      className={rowClassName}
    >
      {content}
    </div>
  );
}

export type { CheckoutOptionRowProps };