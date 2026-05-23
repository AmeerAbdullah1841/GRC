import type { DocumentUploadMeta, QuestionnaireAnswers } from "@/lib/questionnaire-types";
import { emptyQuestionnaire } from "@/lib/questionnaire-types";

export function buildUploadQuestionnaireAnswers(
  extractedText: string,
  fileName: string,
  mimeType: string,
): QuestionnaireAnswers {
  const base = emptyQuestionnaire();
  const uploadMeta: DocumentUploadMeta = {
    source: "document_upload",
    fileName,
    mimeType,
    extractedText,
  };

  return {
    ...base,
    uploadMeta,
    section8: {
      ...base.section8,
      otherComments: `Submitted as uploaded document: ${fileName}`,
    },
  };
}

export function isDocumentUpload(answers: QuestionnaireAnswers): boolean {
  return answers.uploadMeta?.source === "document_upload";
}
