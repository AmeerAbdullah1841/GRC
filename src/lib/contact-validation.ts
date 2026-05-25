export function isContactEmailValid(email: string) {
  const trimmed = email.trim();
  return trimmed.includes("@") && trimmed.includes(".com");
}

export function isContactInfoValid(companyName: string, contactName: string, contactEmail: string) {
  return (
    companyName.trim().length > 0 &&
    contactName.trim().length > 0 &&
    isContactEmailValid(contactEmail)
  );
}
