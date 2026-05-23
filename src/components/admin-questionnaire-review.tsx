import {
  AUTH_LABELS,
  DATA_SUB_LABELS,
  NETWORK_SCOPE_LABELS,
  USER_POP_LABELS,
  VENDOR_ACQ_LABELS,
  formatBool,
  formatList,
  formatText,
  formatYesNoUnsure,
} from "@/lib/questionnaire-labels";
import type { QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { isDocumentUpload } from "@/lib/upload-questionnaire";
import type { ReactNode } from "react";

function QaRow({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-zinc-100 py-4 last:border-0 dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{question}</p>
      <p className="mt-2 ml-6 border-l-2 border-zinc-200 pl-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
        {answer}
      </p>
    </div>
  );
}

function SectionBlock({
  number,
  title,
  purpose,
  children,
}: {
  number: number;
  title: string;
  purpose?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {number}. {title}
        </h3>
        {purpose ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{purpose}</p> : null}
      </div>
      <div className="px-5">{children}</div>
    </section>
  );
}

function UploadedDocumentReview({ answers }: { answers: QuestionnaireAnswers }) {
  const meta = answers.uploadMeta!;
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-violet-200 bg-violet-50/80 px-5 py-4 dark:border-violet-900 dark:bg-violet-950/40">
        <h3 className="text-base font-semibold text-violet-950 dark:text-violet-100">Uploaded questionnaire</h3>
        <p className="mt-2 text-sm text-violet-900 dark:text-violet-200">
          This submission was provided as a file, not the online form. AI analysis used the extracted text below.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-violet-950 dark:text-violet-100">File name</dt>
            <dd className="text-violet-900 dark:text-violet-200">{meta.fileName}</dd>
          </div>
          <div>
            <dt className="font-medium text-violet-950 dark:text-violet-100">File type</dt>
            <dd className="text-violet-900 dark:text-violet-200">{meta.mimeType}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Extracted document text</h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            Full text sent to AI for review ({meta.extractedText.length.toLocaleString()} characters)
          </p>
        </div>
        <pre className="max-h-[min(70vh,720px)] overflow-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          {meta.extractedText}
        </pre>
      </section>
    </div>
  );
}

export function AdminQuestionnaireReview({ answers }: { answers: QuestionnaireAnswers }) {
  if (isDocumentUpload(answers)) {
    return <UploadedDocumentReview answers={answers} />;
  }

  const s1 = answers.section1;
  const s2 = answers.section2;
  const s3 = answers.section3;
  const s4 = answers.section4;
  const s5 = answers.section5;
  const s6 = answers.section6;
  const s7 = answers.section7;
  const s8 = answers.section8;

  return (
    <div className="flex flex-col gap-6">
      <SectionBlock
        number={1}
        title="Data classification"
        purpose="Identifies the highest sensitivity level of data involved."
      >
        <QaRow
          question="1.1 Does the project involve non-public university information?"
          answer={formatBool(s1.involvesNonPublic)}
        />
        {s1.involvesNonPublic ? (
          <>
            <QaRow
              question="Subcategories (check all that applied)"
              answer={formatList(s1.subcategories, DATA_SUB_LABELS)}
            />
            <QaRow
              question="Explain nature, type, quantity of data, and why it is essential"
              answer={formatText(s1.nonPublicExplanation)}
            />
          </>
        ) : null}
      </SectionBlock>

      <SectionBlock
        number={2}
        title="Use of vendor IT services"
        purpose="Describes ongoing vendor IT services and how they are acquired."
      >
        <QaRow
          question="2.1 Will the project acquire ongoing vendor IT services?"
          answer={formatYesNoUnsure(s2.vendorITServices)}
        />
        {s2.vendorITServices === "yes" ? (
          <>
            <QaRow
              question="2.2 Vendor service(s) will be acquired via"
              answer={formatList(s2.acquisitionVia, VENDOR_ACQ_LABELS)}
            />
            {s2.acquisitionVia.includes("other") ? (
              <QaRow question="Other acquisition path — detail" answer={formatText(s2.acquisitionOtherDetail)} />
            ) : null}
            <QaRow
              question="2.3 Describe service(s) to be acquired (including vendor names if known)"
              answer={formatText(s2.servicesDescription)}
            />
          </>
        ) : null}
      </SectionBlock>

      <SectionBlock
        number={3}
        title="Identity management, access control, authorization"
        purpose="Who may access the system and how access is controlled."
      >
        <QaRow
          question="3.1 Who will access this application or system?"
          answer={formatList(s3.userPopulations, USER_POP_LABELS)}
        />
        {s3.userPopulations.includes("other") ? (
          <QaRow question="Other user populations — explain" answer={formatText(s3.userPopulationOther)} />
        ) : null}
        <QaRow
          question="3.2 External entities (outside the university) with access"
          answer={formatText(s3.externalEntities)}
        />
        <QaRow
          question="3.3 Is access limited to only those whose job or function requires it?"
          answer={formatYesNoUnsure(s3.accessLimitedToNeed)}
        />
        <QaRow
          question="3.4 Is any part of the system open to the public or anonymous users?"
          answer={formatYesNoUnsure(s3.publicOrAnonymous)}
        />
        <QaRow
          question="3.5 How will user authorization likely be accomplished?"
          answer={formatText(s3.authorizationProcess)}
        />
        <QaRow question="3.6 Different authorization levels in the system?" answer={formatText(s3.authorizationLevels)} />
        <QaRow
          question="3.7 Identified authority who approves access requests"
          answer={formatText(s3.accessApprover)}
        />
        <QaRow
          question="3.8 Process to notify access administrators when user status or role changes?"
          answer={formatYesNoUnsure(s3.notifiedOnRoleChange)}
        />
        <QaRow
          question="3.9 Uniquely identifiable accounts for all users who need access?"
          answer={formatYesNoUnsure(s3.uniqueAccounts)}
        />
        <QaRow
          question="3.10 How will obsolete accounts be detected and removed?"
          answer={formatText(s3.accountDeprovisioning)}
        />
        <QaRow
          question="3.11 How will the system authenticate users?"
          answer={formatList(s3.authMethods, AUTH_LABELS)}
        />
        {s3.authMethods.includes("other") ? (
          <QaRow question="Other authentication — details" answer={formatText(s3.authOtherDetail)} />
        ) : null}
        {s3.authMethods.includes("local_auth") ? (
          <>
            <QaRow
              question="3.12 Local auth: password complexity and expiration policy"
              answer={formatText(s3.localPasswordPolicy)}
            />
            <QaRow
              question="3.13 Local auth: how passwords are stored (e.g. salted hash)"
              answer={formatText(s3.localPasswordStorage)}
            />
          </>
        ) : null}
        <QaRow
          question="3.14 Automatic logoff / lock / session timeout after inactivity?"
          answer={formatText(s3.sessionTimeout)}
        />
      </SectionBlock>

      <SectionBlock
        number={4}
        title="Network access and communication"
        purpose="Scope of network connectivity and exposure."
      >
        <QaRow
          question="4.1 Is this system required to be network accessible?"
          answer={formatYesNoUnsure(s4.networkRequired)}
        />
        {s4.networkRequired === "yes" ? (
          <>
            <QaRow question="4.2 If yes, it will be accessible" answer={formatList(s4.networkScopes, NETWORK_SCOPE_LABELS)} />
            {s4.networkScopes.includes("other") ? (
              <QaRow question="Other network scope — explain" answer={formatText(s4.networkOtherDetail)} />
            ) : null}
            <QaRow
              question="4.3 Network diagram notes or connectivity description"
              answer={formatText(s4.networkDiagramNotes)}
            />
          </>
        ) : null}
        <QaRow
          question="4.4 Accessible through non-network channels (e.g. telephone)?"
          answer={formatText(s4.nonNetworkAccess)}
        />
      </SectionBlock>

      <SectionBlock number={5} title="Data protection" purpose="Encryption and data handling controls.">
        <QaRow
          question="5.1 Restrictions on data leaving the system"
          answer={formatText(s5.dataExportRestrictions)}
        />
        <QaRow
          question="5.2 Shadow copies / downloads to user devices anticipated?"
          answer={formatText(s5.shadowCopies)}
        />
        <QaRow
          question="5.3 Interfaces with other applications or systems"
          answer={formatText(s5.interfacesWithOtherSystems)}
        />
        <QaRow
          question="5.4 Is non-public university data encrypted at rest?"
          answer={formatYesNoUnsure(s5.encryptedAtRest)}
        />
        <QaRow
          question="5.5 Is data encrypted in transit over untrusted networks?"
          answer={formatYesNoUnsure(s5.encryptedInTransit)}
        />
        <QaRow
          question="5.6 Encryption types, configuration, and deployment"
          answer={formatText(s5.encryptionDetails)}
        />
      </SectionBlock>

      <SectionBlock number={6} title="Logging and auditing" purpose="Audit trails and log protection.">
        <QaRow
          question="6.1 Logs and audit trails produced by the application"
          answer={formatText(s6.logsDescription)}
        />
        <QaRow question="6.2 Is sensitive data embedded in logs?" answer={formatYesNoUnsure(s6.sensitiveInLogs)} />
        <QaRow
          question="6.3 Can logs link actions to individual users?"
          answer={formatYesNoUnsure(s6.logsLinkToUsers)}
        />
        <QaRow
          question="6.4 Successful / unsuccessful access logging; client network address?"
          answer={formatText(s6.accessLoggingDetail)}
        />
        <QaRow question="6.5 Log retention period" answer={formatText(s6.logRetention)} />
      </SectionBlock>

      <SectionBlock
        number={7}
        title="Business continuity / disaster recovery"
        purpose="Recovery and continuity planning."
      >
        <QaRow
          question="7.1 Documented BCP/DR plan (restore procedures, staff, contacts, partners)"
          answer={formatText(s7.bcpPlan)}
        />
      </SectionBlock>

      <SectionBlock number={8} title="Other comments">
        <QaRow question="8 Additional context for reviewers" answer={formatText(s8.otherComments)} />
      </SectionBlock>
    </div>
  );
}
