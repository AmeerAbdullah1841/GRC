"use client";

import type { YesNoUnsure } from "@/lib/questionnaire-types";

export function LabeledTextarea({
  label,
  value,
  onChange,
  rows = 4,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <textarea
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800 dark:text-zinc-200">
      <input
        type="checkbox"
        className="mt-1 size-4 rounded border-zinc-400"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function YesNoUnsureGroup({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: YesNoUnsure;
  onChange: (v: YesNoUnsure) => void;
}) {
  const opts: { id: YesNoUnsure; title: string }[] = [
    { id: "yes", title: "Yes" },
    { id: "no", title: "No" },
    { id: "unsure", title: "Unsure / not yet determined" },
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</legend>
      <div className="flex flex-wrap gap-4">
        {opts.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name={name}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="size-4 border-zinc-400"
            />
            {o.title}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      {n}. {children}
    </h2>
  );
}
