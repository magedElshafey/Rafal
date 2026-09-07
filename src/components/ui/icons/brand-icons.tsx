import { forwardRef, type SVGProps } from "react";

export interface BrandIconProps extends SVGProps<SVGSVGElement> {
  label?: string;
  variant?: "brand" | "monochrome";
}

function brandAccessibility(label?: string) {
  return {
    "aria-hidden": label ? undefined : (true as const),
    "aria-label": label,
    focusable: "false" as const,
    role: label ? ("img" as const) : undefined,
  };
}

const applePath =
  "M10.1268 5.74667c-.79 0-2.0125-.89834-3.3-.86667-1.7.0225-3.25833.98583-4.13417 2.51167C.92843 10.45417 2.2376 14.9775 3.95843 17.4667c.84416 1.2116 1.84 2.575 3.16 2.5325 1.26666-.0542 1.74166-.8225 3.27917-.8225 1.5258 0 1.9583.8225 3.3.79 1.3642-.0217 2.23-1.2334 3.0633-2.4567.9634-1.4067 1.3634-2.7708 1.385-2.8458-.0325-.0109-2.6516-1.0175-2.6833-4.0475-.0217-2.53337 2.0667-3.74504 2.1642-3.7992-1.1909-1.74167-3.0192-1.93667-3.6584-1.98-1.6666-.13-3.0625.90917-3.8416.90917Zm2.815-2.555c.7025-.84334 1.1666-2.0225 1.0375-3.19167-1.0059.04333-2.2184.67083-2.9434 1.515-.65.74667-1.21164 1.94833-1.06081 3.095 1.11501.08667 2.26251-.57333 2.96581-1.4175";

export const AppleIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, variant = "brand", ...props }, ref) => {
    const monochrome = variant === "monochrome";
    return (
      <svg
        ref={ref}
        viewBox="0 0 20 20"
        {...brandAccessibility(label)}
        {...props}
      >
        <path d={applePath} fill={monochrome ? "currentColor" : "#4285F4"} />
      </svg>
    );
  },
);
AppleIcon.displayName = "AppleIcon";

export const GoogleIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, variant = "brand", ...props }, ref) => {
    const monochrome = variant === "monochrome";

    return (
      <svg
        ref={ref}
        viewBox="0 0 20 20"
        {...brandAccessibility(label)}
        {...props}
      >
        <path
          fill={monochrome ? "currentColor" : "#4285F4"}
          d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382A4.6 4.6 0 0 1 13.386 15.068v2.509h3.232c1.891-1.741 2.982-4.305 2.982-7.35Z"
        />
        <path
          fill={monochrome ? "currentColor" : "#34A853"}
          d="M10 20c2.7 0 4.964-.896 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.809-1.76-5.595-4.123H1.064v2.59A9.998 9.998 0 0 0 10 20Z"
        />
        <path
          fill={monochrome ? "currentColor" : "#FBBC05"}
          d="M4.405 11.9A6.018 6.018 0 0 1 4.09 10c0-.659.114-1.3.314-1.9V5.51h-3.34A9.998 9.998 0 0 0 0 10c0 1.614.386 3.141 1.064 4.491l3.34-2.59Z"
        />
        <path
          fill={monochrome ? "currentColor" : "#EA4335"}
          d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.696 0 10 0a9.998 9.998 0 0 0-8.936 5.51l3.34 2.59C5.191 5.736 7.396 3.977 10 3.977Z"
        />
      </svg>
    );
  },
);
GoogleIcon.displayName = "GoogleIcon";

export const FacebookIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 20 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <circle cx="10" cy="10" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.9 10.58h-2.48V19H7.65v-8.42H5.8V7.37h1.85V5.3c0-2.5 1.13-4.3 4.69-4.3.75 0 1.55.08 1.86.12v3.17h-1.57c-1.22 0-1.21.46-1.21 1.32v1.76h2.8l-.32 3.21Z"
      />
    </svg>
  ),
);
FacebookIcon.displayName = "FacebookIcon";

export const VisaIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 32 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="32" height="20" rx="4" fill="#1A1F71" />
      <path
        fill="#fff"
        d="m7.897 7.182 1.406 4.42h.054l1.409-4.42h1.364L10.124 13H8.539L6.53 7.182h1.367Zm6.163 0V13h-1.23V7.182h1.23Zm4.168 1.673c-.023-.229-.12-.407-.292-.534-.173-.127-.407-.19-.702-.19-.2 0-.37.028-.508.085-.138.055-.244.132-.318.23a.54.54 0 0 0-.109.335c-.003.104.018.195.066.273.049.077.116.145.201.202.085.055.184.103.296.145.111.04.23.073.358.102l.522.125c.254.057.487.132.7.227.211.095.395.211.55.35.156.138.276.3.361.488.087.188.132.403.134.645-.002.356-.093.665-.273.926-.178.26-.435.461-.773.605-.335.142-.739.213-1.213.213-.47 0-.879-.072-1.227-.216-.347-.144-.618-.357-.813-.64-.193-.283-.294-.635-.304-1.053h1.191c.013.195.07.358.168.489.1.129.234.226.4.292.17.065.36.097.572.097.208 0 .39-.03.543-.09.155-.061.275-.146.36-.254a.574.574 0 0 0 .128-.372.493.493 0 0 0-.116-.329c-.076-.09-.188-.165-.336-.228a3.31 3.31 0 0 0-.537-.17l-.634-.16c-.49-.12-.878-.306-1.162-.559-.284-.254-.425-.596-.423-1.026-.002-.352.092-.66.281-.923.191-.263.454-.469.787-.616.333-.148.712-.222 1.136-.222.432 0 .809.074 1.131.222.324.147.576.353.756.616.18.263.272.568.278.915h-1.18ZM21.184 13h-1.318l2.009-5.818h1.585L25.466 13h-1.319l-1.457-4.489h-.046L21.184 13Zm-.082-2.287h3.114v.96h-3.114v-.96Z"
      />
    </svg>
  ),
);
VisaIcon.displayName = "VisaIcon";

export const MastercardIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 32 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="32" height="20" rx="4" fill="#fff" />
      <circle cx="13" cy="10" r="5.5" fill="#EB001B" />
      <circle cx="19" cy="10" r="5.5" fill="#F79E1B" />
      <path
        fill="#FF5F00"
        d="M16 5.42A5.49 5.49 0 0 1 18.5 10a5.49 5.49 0 0 1-2.5 4.58A5.49 5.49 0 0 1 13.5 10 5.49 5.49 0 0 1 16 5.42Z"
      />
    </svg>
  ),
);
MastercardIcon.displayName = "MastercardIcon";

export const SaudiFlagIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 16"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="24" height="16" rx="2" fill="#00663D" />
      <path
        fill="#fff"
        d="M5 11.5h14v1H5zm2.1-5.8h9.8v.9H7.1zm1.1 1.6h7.6v.8H8.2zm1.3 1.5h5v.8h-5z"
      />
      <path
        d="M18.4 10.2c-2.8 1-7.8 1-12.8 0"
        fill="none"
        stroke="#fff"
        strokeWidth=".7"
        strokeLinecap="round"
      />
    </svg>
  ),
);
SaudiFlagIcon.displayName = "SaudiFlagIcon";

export const ApplePayIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 39 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="39" height="20" rx="4" fill="#fff" />
      <path d={applePath} fill="#000" transform="translate(3 4) scale(.6)" />
      <path
        fill="#000"
        d="M17 6h3.2c2.1 0 3.4 1.1 3.4 3s-1.3 3.1-3.5 3.1h-1.3V15H17V6Zm1.8 1.5v3.1H20c1.1 0 1.8-.5 1.8-1.6 0-1-.7-1.5-1.8-1.5h-1.2ZM25.1 8.3c.6-.4 1.5-.7 2.4-.7 2.1 0 3.1 1 3.1 2.8V15H29v-.9h-.1c-.4.7-1.1 1.1-2 1.1-1.3 0-2.3-.8-2.3-2 0-1.4 1.1-2.2 3-2.2H29v-.5c0-.9-.5-1.4-1.5-1.4-.7 0-1.3.2-1.9.5l-.5-1.3Zm3.9 4h-1.2c-1 0-1.5.3-1.5.9 0 .5.5.8 1.1.8.9 0 1.6-.6 1.6-1.5v-.2ZM31.2 7.8H33l1.8 5.2h.1l1.7-5.2h1.8l-3 7.8c-.6 1.6-1.4 2.2-2.8 2.2-.3 0-.7 0-.9-.1v-1.4h.6c.7 0 1.1-.3 1.4-1l.1-.3-2.6-7.2Z"
      />
    </svg>
  ),
);
ApplePayIcon.displayName = "ApplePayIcon";

export const MadaIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 32 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="32" height="20" rx="4" fill="#00837C" />
      <path
        fill="#fff"
        d="M4 6h3.2v8H4zM8.3 8h2.3v6H8.3zM11.7 5h2.4v9h-2.4zM15.2 7h2.6v7h-2.6zM19 6h2.5v8H19zM22.7 8h2.2v6h-2.2zM26 5h2v9h-2z"
      />
    </svg>
  ),
);
MadaIcon.displayName = "MadaIcon";

export const BankIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      {...brandAccessibility(label)}
      {...props}
    >
      <path
        d="m3 9 9-5 9 5M5 10v7m4-7v7m6-7v7m4-7v7M3 20h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
);
BankIcon.displayName = "BankIcon";

export const CashIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      {...brandAccessibility(label)}
      {...props}
    >
      <path
        d="M3 6h18v12H3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 9a2 2 0 0 1-2 2v2a2 2 0 0 1 2 2m10-6a2 2 0 0 0 2 2v2a2 2 0 0 0-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ),
);
CashIcon.displayName = "CashIcon";

export const TabbyIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 34 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="34" height="20" rx="4" fill="#5A31F4" />
      <path
        fill="#fff"
        d="M5 6h8v2H10v7H8V8H5zm9 2h2v1c.5-.7 1.2-1.2 2.3-1.2 1.8 0 3.2 1.5 3.2 3.6 0 2.2-1.4 3.7-3.3 3.7-1 0-1.7-.4-2.2-1.1v1h-2V8Zm3.7 1.6c-1 0-1.7.8-1.7 1.8 0 1.1.7 1.9 1.7 1.9 1.1 0 1.8-.8 1.8-1.9 0-1-.7-1.8-1.8-1.8ZM22 8h2v1c.5-.7 1.2-1.2 2.3-1.2 1.8 0 3.2 1.5 3.2 3.6 0 2.2-1.4 3.7-3.3 3.7-1 0-1.7-.4-2.2-1.1v1h-2V8Zm3.7 1.6c-1 0-1.7.8-1.7 1.8 0 1.1.7 1.9 1.7 1.9 1.1 0 1.8-.8 1.8-1.9 0-1-.7-1.8-1.8-1.8Z"
      />
    </svg>
  ),
);
TabbyIcon.displayName = "TabbyIcon";

export const TamaraIcon = forwardRef<SVGSVGElement, BrandIconProps>(
  ({ label, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 38 20"
      {...brandAccessibility(label)}
      {...props}
    >
      <rect width="38" height="20" rx="4" fill="#51C7A2" />
      <path
        fill="#fff"
        d="M5 6h8v2h-3v7H8V8H5zm10 2h2v7h-2zm4 0h2v1c.5-.8 1.2-1.2 2.2-1.2 1.1 0 1.9.5 2.3 1.3.6-.9 1.4-1.3 2.5-1.3 1.7 0 2.7 1.1 2.7 3V15h-2v-3.8c0-1-.5-1.6-1.3-1.6-.9 0-1.5.7-1.5 1.8V15h-2v-3.8c0-1-.5-1.6-1.3-1.6-.9 0-1.6.7-1.6 1.8V15h-2V8Zm13 0h2v1.2c.4-.8 1.1-1.3 2-1.3v2c-1.3 0-2 .7-2 2.2V15h-2V8Z"
      />
    </svg>
  ),
);
TamaraIcon.displayName = "TamaraIcon";
