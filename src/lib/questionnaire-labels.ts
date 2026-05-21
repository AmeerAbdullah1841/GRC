import type {
  AuthMethod,
  DataSubcategory,
  NetworkScope,
  UserPopulation,
  VendorAcquisition,
  YesNoUnsure,
} from "@/lib/questionnaire-types";

export const DATA_SUB_LABELS: Record<DataSubcategory, string> = {
  pii: "Personally identifiable information",
  ferpa: "Educational records / FERPA",
  hipaa: "Health information / HIPAA",
  financial: "Financial information",
  hr: "Human resources information",
  research: "Research information",
  other_sensitive: "Other sensitive / confidential data",
};

export const VENDOR_ACQ_LABELS: Record<VendorAcquisition, string> = {
  rfp: "Request for proposal",
  sole_source: "Sole source procurement",
  purchase_order: "Purchase order",
  online_license: "Vendor online license / terms",
  other: "Other",
};

export const USER_POP_LABELS: Record<UserPopulation, string> = {
  faculty: "Faculty",
  staff: "Staff",
  students: "Students",
  consultants: "Consultants and temporary employees",
  other: "Other",
};

export const AUTH_LABELS: Record<AuthMethod, string> = {
  cuny_portal_ldap: "CUNY Portal LDAP / SSO",
  cuny_ad: "Active Directory (cuny.adlan)",
  cuny_enterprise_ad: "CUNY Enterprise Active Directory",
  cunyfirst_sso: "CUNYfirst SSO",
  local_auth: "Local authentication",
  other: "Other",
};

export const NETWORK_SCOPE_LABELS: Record<NetworkScope, string> = {
  cuny_central: "CUNY central office networks only",
  cuny_campus: "CUNY campus network(s)",
  cuny_central_and_campus: "Central office and campus networks",
  internet: "The Internet at large",
  other: "Other",
};

export function formatYesNoUnsure(v: YesNoUnsure): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "Unsure / not yet determined";
}

export function formatBool(v: boolean): string {
  return v ? "Yes" : "No";
}

export function formatText(v: string | undefined | null): string {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : "—";
}

export function formatList<T extends string>(ids: T[], labels: Record<T, string>): string {
  if (!ids.length) return "—";
  return ids.map((id) => labels[id] ?? id).join("; ");
}
