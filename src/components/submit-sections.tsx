"use client";

import type {
  AuthMethod,
  DataSubcategory,
  NetworkScope,
  QuestionnaireAnswers,
  UserPopulation,
  VendorAcquisition,
} from "@/lib/questionnaire-types";
import type { Dispatch, SetStateAction } from "react";
import { CheckRow, LabeledTextarea, SectionTitle, YesNoUnsureGroup } from "./field-helpers";

type P = {
  data: QuestionnaireAnswers;
  set: Dispatch<SetStateAction<QuestionnaireAnswers>>;
};

function toggle<T extends string>(arr: T[], id: T): T[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

export function IntroPanel() {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none text-sm">
      <p className="text-zinc-700 dark:text-zinc-300">
        Identifying information security requirements in the earliest planning stages of a technology
        project reduces the risk of introducing new issues into the university environment. Involving
        information security early also minimizes schedule delays when controls are retrofitted late.
      </p>
      <p className="text-zinc-700 dark:text-zinc-300">
        Vendors should complete all sections truthfully. The questionnaire feeds an automated risk
        summary; the university security team always makes the final approval decision.
      </p>
    </div>
  );
}

export function Section1({ data, set }: P) {
  const s = data.section1;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section1: { ...d.section1, ...x } }));
  const subs: { id: DataSubcategory; label: string }[] = [
    { id: "pii", label: "Personally identifiable information" },
    { id: "ferpa", label: "Educational records / FERPA" },
    { id: "hipaa", label: "Health information / HIPAA" },
    { id: "financial", label: "Financial information (cards, bank, salary, aid, …)" },
    { id: "hr", label: "Human resources information" },
    { id: "research", label: "Research information" },
    { id: "other_sensitive", label: "Other sensitive, private, confidential, or non-public data" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={1}>Data classification</SectionTitle>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Identifies the highest sensitivity level involved so baseline data security requirements can be
        determined.
      </p>
      <CheckRow
        label="The project involves non-public university information"
        checked={s.involvesNonPublic}
        onChange={(v) => u({ involvesNonPublic: v })}
      />
      {s.involvesNonPublic ? (
        <div className="ml-6 flex flex-col gap-3 border-l-2 border-amber-200 pl-4 dark:border-amber-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Subcategories</p>
          {subs.map((x) => (
            <CheckRow
              key={x.id}
              label={x.label}
              checked={s.subcategories.includes(x.id)}
              onChange={() => u({ subcategories: toggle(s.subcategories, x.id) })}
            />
          ))}
          <LabeledTextarea
            label="If any subcategory applies, explain the nature, type, quantity of data, and why it is essential."
            value={s.nonPublicExplanation}
            onChange={(v) => u({ nonPublicExplanation: v })}
            rows={5}
          />
        </div>
      ) : null}
    </div>
  );
}

export function Section2({ data, set }: P) {
  const s = data.section2;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section2: { ...d.section2, ...x } }));
  const opts: { id: VendorAcquisition; label: string }[] = [
    { id: "rfp", label: "Request for proposal" },
    { id: "sole_source", label: "Sole source procurement" },
    { id: "purchase_order", label: "Purchase order" },
    { id: "online_license", label: "Agreement to vendor online license / terms" },
    { id: "other", label: "Other" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={2}>Use of vendor IT services</SectionTitle>
      <YesNoUnsureGroup
        name="s2-vendor"
        label="Will the project acquire ongoing vendor IT services (hosting, infrastructure, storage, staffing, …)?"
        value={s.vendorITServices}
        onChange={(v) => u({ vendorITServices: v })}
      />
      {s.vendorITServices === "yes" ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Vendor service(s) will be acquired via (check all that apply)</span>
            {opts.map((o) => (
              <CheckRow
                key={o.id}
                label={o.label}
                checked={s.acquisitionVia.includes(o.id)}
                onChange={() => u({ acquisitionVia: toggle(s.acquisitionVia, o.id) })}
              />
            ))}
            {s.acquisitionVia.includes("other") ? (
              <LabeledTextarea
                label="Describe “other” acquisition path"
                value={s.acquisitionOtherDetail}
                onChange={(v) => u({ acquisitionOtherDetail: v })}
                rows={2}
              />
            ) : null}
          </div>
          <LabeledTextarea
            label="Briefly describe the service(s) to be acquired, including vendor names if known (Section 2.3)"
            value={s.servicesDescription}
            onChange={(v) => u({ servicesDescription: v })}
            rows={4}
          />
        </>
      ) : null}
    </div>
  );
}

export function Section3({ data, set }: P) {
  const s = data.section3;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section3: { ...d.section3, ...x } }));
  const pops: { id: UserPopulation; label: string }[] = [
    { id: "faculty", label: "Faculty" },
    { id: "staff", label: "Staff" },
    { id: "students", label: "Students" },
    { id: "consultants", label: "Consultants and temporary employees" },
    { id: "other", label: "Other" },
  ];
  const auth: { id: AuthMethod; label: string }[] = [
    { id: "cuny_portal_ldap", label: "CUNY Portal LDAP / SSO" },
    { id: "cuny_ad", label: "Active Directory (cuny.adlan)" },
    { id: "cuny_enterprise_ad", label: "CUNY Enterprise Active Directory" },
    { id: "cunyfirst_sso", label: "CUNYfirst SSO" },
    { id: "local_auth", label: "Local authentication" },
    { id: "other", label: "Other" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={3}>Identity management, access control, authorization</SectionTitle>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Who will access this application or system?</span>
        {pops.map((p) => (
          <CheckRow
            key={p.id}
            label={p.label}
            checked={s.userPopulations.includes(p.id)}
            onChange={() => u({ userPopulations: toggle(s.userPopulations, p.id) })}
          />
        ))}
      </div>
      {s.userPopulations.includes("other") ? (
        <LabeledTextarea label="Explain other user populations" value={s.userPopulationOther} onChange={(v) => u({ userPopulationOther: v })} rows={2} />
      ) : null}
      <LabeledTextarea
        label="External entities (outside the university) with access, if any (3.2)"
        value={s.externalEntities}
        onChange={(v) => u({ externalEntities: v })}
      />
      <YesNoUnsureGroup
        name="s3-need"
        label="Is access limited to only those whose job or function requires it? (3.3)"
        value={s.accessLimitedToNeed}
        onChange={(v) => u({ accessLimitedToNeed: v })}
      />
      <YesNoUnsureGroup
        name="s3-pub"
        label="Is any part of the system open to the public or anonymous users? (3.4)"
        value={s.publicOrAnonymous}
        onChange={(v) => u({ publicOrAnonymous: v })}
      />
      <LabeledTextarea
        label="How will user authorization likely be accomplished? (3.5)"
        value={s.authorizationProcess}
        onChange={(v) => u({ authorizationProcess: v })}
      />
      <LabeledTextarea
        label="Different authorization levels (full, read-only, …)? (3.6)"
        value={s.authorizationLevels}
        onChange={(v) => u({ authorizationLevels: v })}
      />
      <LabeledTextarea
        label="Identified authority who approves access requests (3.7)"
        value={s.accessApprover}
        onChange={(v) => u({ accessApprover: v })}
      />
      <YesNoUnsureGroup
        name="s3-role"
        label="Process to notify access administrators when user status or role changes? (3.8)"
        value={s.notifiedOnRoleChange}
        onChange={(v) => u({ notifiedOnRoleChange: v })}
      />
      <YesNoUnsureGroup
        name="s3-uniq"
        label="Uniquely identifiable accounts for all users who need access? (3.9)"
        value={s.uniqueAccounts}
        onChange={(v) => u({ uniqueAccounts: v })}
      />
      <LabeledTextarea
        label="How will obsolete accounts be detected and removed? (3.10)"
        value={s.accountDeprovisioning}
        onChange={(v) => u({ accountDeprovisioning: v })}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">How will the system authenticate users? (3.11)</span>
        {auth.map((a) => (
          <CheckRow
            key={a.id}
            label={a.label}
            checked={s.authMethods.includes(a.id)}
            onChange={() => u({ authMethods: toggle(s.authMethods, a.id) })}
          />
        ))}
      </div>
      {s.authMethods.includes("other") ? (
        <LabeledTextarea label="Other authentication — details" value={s.authOtherDetail} onChange={(v) => u({ authOtherDetail: v })} rows={2} />
      ) : null}
      {s.authMethods.includes("local_auth") ? (
        <>
          <LabeledTextarea
            label="Local auth: password complexity and expiration policy (3.12)"
            value={s.localPasswordPolicy}
            onChange={(v) => u({ localPasswordPolicy: v })}
          />
          <LabeledTextarea
            label="Local auth: how passwords are stored (e.g. salted hash) (3.13)"
            value={s.localPasswordStorage}
            onChange={(v) => u({ localPasswordStorage: v })}
          />
        </>
      ) : null}
      <LabeledTextarea
        label="Automatic logoff / lock / session timeout after inactivity? (3.14)"
        value={s.sessionTimeout}
        onChange={(v) => u({ sessionTimeout: v })}
      />
    </div>
  );
}

export function Section4({ data, set }: P) {
  const s = data.section4;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section4: { ...d.section4, ...x } }));
  const scopes: { id: NetworkScope; label: string }[] = [
    { id: "cuny_central", label: "Only CUNY central office networks" },
    { id: "cuny_campus", label: "Only one or more campus networks" },
    { id: "cuny_central_and_campus", label: "Central office and campus networks" },
    { id: "internet", label: "The Internet at large" },
    { id: "other", label: "Other — explain" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={4}>Network access and communication</SectionTitle>
      <YesNoUnsureGroup
        name="s4-netreq"
        label="Is this system required to be network accessible? (4.1)"
        value={s.networkRequired}
        onChange={(v) => u({ networkRequired: v })}
      />
      {s.networkRequired === "yes" ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">If yes, it will be accessible (4.2)</span>
            {scopes.map((sc) => (
              <CheckRow
                key={sc.id}
                label={sc.label}
                checked={s.networkScopes.includes(sc.id)}
                onChange={() => u({ networkScopes: toggle(s.networkScopes, sc.id) })}
              />
            ))}
          </div>
          {s.networkScopes.includes("other") ? (
            <LabeledTextarea label="Other network scope — explain" value={s.networkOtherDetail} onChange={(v) => u({ networkOtherDetail: v })} rows={2} />
          ) : null}
          <LabeledTextarea
            label="Network diagram notes or connectivity description (4.3)"
            value={s.networkDiagramNotes}
            onChange={(v) => u({ networkDiagramNotes: v })}
          />
        </>
      ) : null}
      <LabeledTextarea
        label="Accessible through non-network channels (e.g. telephone)? (4.4)"
        value={s.nonNetworkAccess}
        onChange={(v) => u({ nonNetworkAccess: v })}
      />
    </div>
  );
}

export function Section5({ data, set }: P) {
  const s = data.section5;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section5: { ...d.section5, ...x } }));
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={5}>Data protection</SectionTitle>
      <LabeledTextarea
        label="Restrictions on data leaving the system (5.1)"
        value={s.dataExportRestrictions}
        onChange={(v) => u({ dataExportRestrictions: v })}
      />
      <LabeledTextarea
        label="Shadow copies / downloads to user devices anticipated? (5.2)"
        value={s.shadowCopies}
        onChange={(v) => u({ shadowCopies: v })}
      />
      <LabeledTextarea
        label="Interfaces with other applications or systems (5.3)"
        value={s.interfacesWithOtherSystems}
        onChange={(v) => u({ interfacesWithOtherSystems: v })}
      />
      <YesNoUnsureGroup
        name="s5-rest"
        label="Is non-public university data encrypted at rest? (5.4)"
        value={s.encryptedAtRest}
        onChange={(v) => u({ encryptedAtRest: v })}
      />
      <YesNoUnsureGroup
        name="s5-transit"
        label="Is data encrypted in transit over untrusted networks? (5.5)"
        value={s.encryptedInTransit}
        onChange={(v) => u({ encryptedInTransit: v })}
      />
      <LabeledTextarea
        label="Encryption types, configuration, and deployment (5.6)"
        value={s.encryptionDetails}
        onChange={(v) => u({ encryptionDetails: v })}
      />
    </div>
  );
}

export function Section6({ data, set }: P) {
  const s = data.section6;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section6: { ...d.section6, ...x } }));
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={6}>Logging and auditing</SectionTitle>
      <LabeledTextarea
        label="Logs and audit trails produced by the application (6.1)"
        value={s.logsDescription}
        onChange={(v) => u({ logsDescription: v })}
      />
      <YesNoUnsureGroup
        name="s6-sens"
        label="Is sensitive data embedded in logs? (6.2)"
        value={s.sensitiveInLogs}
        onChange={(v) => u({ sensitiveInLogs: v })}
      />
      <YesNoUnsureGroup
        name="s6-link"
        label="Can logs link actions to individual users? (6.3)"
        value={s.logsLinkToUsers}
        onChange={(v) => u({ logsLinkToUsers: v })}
      />
      <LabeledTextarea
        label="Successful / unsuccessful access logging; client network address? (6.4)"
        value={s.accessLoggingDetail}
        onChange={(v) => u({ accessLoggingDetail: v })}
      />
      <LabeledTextarea label="Log retention period (6.5)" value={s.logRetention} onChange={(v) => u({ logRetention: v })} />
    </div>
  );
}

export function Section7({ data, set }: P) {
  const s = data.section7;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section7: { ...d.section7, ...x } }));
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={7}>Business continuity / disaster recovery</SectionTitle>
      <LabeledTextarea
        label="Documented BCP/DR plan: restore procedures, responsible staff, contacts, partners (7.1)"
        value={s.bcpPlan}
        onChange={(v) => u({ bcpPlan: v })}
        rows={6}
      />
    </div>
  );
}

export function Section8({ data, set }: P) {
  const s = data.section8;
  const u = (x: Partial<typeof s>) => set((d) => ({ ...d, section8: { ...d.section8, ...x } }));
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle n={8}>Other comments</SectionTitle>
      <LabeledTextarea label="Additional context for reviewers" value={s.otherComments} onChange={(v) => u({ otherComments: v })} rows={6} />
    </div>
  );
}
