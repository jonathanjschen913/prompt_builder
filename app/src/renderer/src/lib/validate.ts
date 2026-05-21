import { TAG_NAME_PATTERN } from '@shared/types';

export interface TagNameValidation {
  ok: boolean;
  error?: string;
}

export function validateTagName(
  name: string,
  existingNames: string[],
  currentName?: string
): TagNameValidation {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Name is required.' };
  if (!TAG_NAME_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: 'Use lowercase letters, digits, and underscores only (must start with a letter).',
    };
  }
  const conflict = existingNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase() && n !== currentName
  );
  if (conflict) return { ok: false, error: 'A tag with that name already exists.' };
  return { ok: true };
}

export function validateTemplateName(
  name: string,
  existingNames: string[],
  currentName?: string
): TagNameValidation {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Name is required.' };
  const conflict = existingNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase() && n !== currentName
  );
  if (conflict) return { ok: false, error: 'A template with that name already exists.' };
  return { ok: true };
}

export function nextAutoTemplateName(existingNames: string[]): string {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  let n = 1;
  while (taken.has(`template_${n}`)) n++;
  return `template_${n}`;
}
