const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_EXT = new Set(["pdf", "docx", "txt"]);

export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return "File is too large. Maximum size is 10 MB.";
  }
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(file.type)) {
    return "Unsupported file type. Upload a PDF, DOCX, or TXT file.";
  }
  return null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return typeof result.text === "string" ? result.text : "";
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "InvalidPDFException" || name === "PasswordException") {
      throw new Error(
        "Could not read this PDF. Use a standard text PDF, or try DOCX/TXT. Password-protected files are not supported.",
      );
    }
    throw e;
  } finally {
    await parser.destroy();
  }
}

export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";

  if (mimeType === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf" || ext === "pdf") {
    return extractPdfText(buffer);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return typeof result.value === "string" ? result.value : "";
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, or TXT.");
}

export function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
