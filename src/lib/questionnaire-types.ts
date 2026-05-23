/** Subcategories under non-public university information (Section 1.1) */
export type DataSubcategory =
  | "pii"
  | "ferpa"
  | "hipaa"
  | "financial"
  | "hr"
  | "research"
  | "other_sensitive";

export type VendorAcquisition =
  | "rfp"
  | "sole_source"
  | "purchase_order"
  | "online_license"
  | "other";

export type UserPopulation =
  | "faculty"
  | "staff"
  | "students"
  | "consultants"
  | "other";

export type AuthMethod =
  | "cuny_portal_ldap"
  | "cuny_ad"
  | "cuny_enterprise_ad"
  | "cunyfirst_sso"
  | "local_auth"
  | "other";

export type NetworkScope =
  | "cuny_central"
  | "cuny_campus"
  | "cuny_central_and_campus"
  | "internet"
  | "other";

export type YesNoUnsure = "yes" | "no" | "unsure";

/** Present when the vendor submitted an uploaded PDF/DOCX/TXT instead of the web form. */
export type DocumentUploadMeta = {
  source: "document_upload";
  fileName: string;
  mimeType: string;
  extractedText: string;
};

export type QuestionnaireAnswers = {
  uploadMeta?: DocumentUploadMeta;
  section1: {
    involvesNonPublic: boolean;
    subcategories: DataSubcategory[];
    nonPublicExplanation: string;
  };
  section2: {
    vendorITServices: YesNoUnsure;
    acquisitionVia: VendorAcquisition[];
    acquisitionOtherDetail: string;
    servicesDescription: string;
  };
  section3: {
    userPopulations: UserPopulation[];
    userPopulationOther: string;
    externalEntities: string;
    accessLimitedToNeed: YesNoUnsure;
    publicOrAnonymous: YesNoUnsure;
    authorizationProcess: string;
    authorizationLevels: string;
    accessApprover: string;
    notifiedOnRoleChange: YesNoUnsure;
    uniqueAccounts: YesNoUnsure;
    accountDeprovisioning: string;
    authMethods: AuthMethod[];
    authOtherDetail: string;
    localPasswordPolicy: string;
    localPasswordStorage: string;
    sessionTimeout: string;
  };
  section4: {
    networkRequired: YesNoUnsure;
    networkScopes: NetworkScope[];
    networkOtherDetail: string;
    networkDiagramNotes: string;
    nonNetworkAccess: string;
  };
  section5: {
    dataExportRestrictions: string;
    shadowCopies: string;
    interfacesWithOtherSystems: string;
    encryptedAtRest: YesNoUnsure;
    encryptedInTransit: YesNoUnsure;
    encryptionDetails: string;
  };
  section6: {
    logsDescription: string;
    sensitiveInLogs: YesNoUnsure;
    logsLinkToUsers: YesNoUnsure;
    accessLoggingDetail: string;
    logRetention: string;
  };
  section7: {
    bcpPlan: string;
  };
  section8: {
    otherComments: string;
  };
};

export const emptyQuestionnaire = (): QuestionnaireAnswers => ({
  section1: {
    involvesNonPublic: false,
    subcategories: [],
    nonPublicExplanation: "",
  },
  section2: {
    vendorITServices: "unsure",
    acquisitionVia: [],
    acquisitionOtherDetail: "",
    servicesDescription: "",
  },
  section3: {
    userPopulations: [],
    userPopulationOther: "",
    externalEntities: "",
    accessLimitedToNeed: "unsure",
    publicOrAnonymous: "unsure",
    authorizationProcess: "",
    authorizationLevels: "",
    accessApprover: "",
    notifiedOnRoleChange: "unsure",
    uniqueAccounts: "unsure",
    accountDeprovisioning: "",
    authMethods: [],
    authOtherDetail: "",
    localPasswordPolicy: "",
    localPasswordStorage: "",
    sessionTimeout: "",
  },
  section4: {
    networkRequired: "unsure",
    networkScopes: [],
    networkOtherDetail: "",
    networkDiagramNotes: "",
    nonNetworkAccess: "",
  },
  section5: {
    dataExportRestrictions: "",
    shadowCopies: "",
    interfacesWithOtherSystems: "",
    encryptedAtRest: "unsure",
    encryptedInTransit: "unsure",
    encryptionDetails: "",
  },
  section6: {
    logsDescription: "",
    sensitiveInLogs: "unsure",
    logsLinkToUsers: "unsure",
    accessLoggingDetail: "",
    logRetention: "",
  },
  section7: {
    bcpPlan: "",
  },
  section8: {
    otherComments: "",
  },
});
