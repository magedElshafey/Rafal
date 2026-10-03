const phonePattern = /^\+?[\d\s()-]+$/;

export function isValidPhoneFormat(value: string): boolean {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");

  return (
    phonePattern.test(phone) &&
    digits.length >= 8 &&
    digits.length <= 15
  );
}
