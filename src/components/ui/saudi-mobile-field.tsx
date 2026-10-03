import { SaudiFlagIcon } from "@/components/ui/icons";
import {
  PhoneInputField,
  type PhoneInputFieldProps,
} from "@/components/ui/input";

type SaudiMobileFieldProps = Omit<
  PhoneInputFieldProps,
  "autoComplete" | "countryCode" | "countryFlag"
>;

export function SaudiMobileField(props: SaudiMobileFieldProps) {
  return (
    <PhoneInputField
      {...props}
      autoComplete="tel-national"
      countryCode="+966"
      countryFlag={<SaudiFlagIcon className="size-full" />}
    />
  );
}
