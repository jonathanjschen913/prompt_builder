import type { Tag, Template } from '@shared/types';

export interface GenerateResult {
  output: string;
  contributingPositions: number[];
}

export function generatePrompt(
  template: Template,
  tagsById: Map<string, Tag>,
  drafts: Record<string, string>
): GenerateResult {
  const blocks: string[] = [];
  const contributing: number[] = [];

  template.tagIds.forEach((tagId, idx) => {
    const tag = tagsById.get(tagId);
    if (!tag) return;
    const raw = drafts[String(idx)] ?? '';
    const trimmed = raw.trim();
    if (!trimmed) return;
    blocks.push(`<${tag.name}>\n${trimmed}\n</${tag.name}>`);
    contributing.push(idx);
  });

  const output = blocks.join('\n\n').replace(/\s+$/g, '');
  return { output, contributingPositions: contributing };
}
