import { randomUUID } from 'node:crypto';
import type { AppData, Tag, Template } from './types';
import { SCHEMA_VERSION } from './types';

interface DefaultTagSeed {
  name: string;
  description: string;
  placeholder: string;
}

const DEFAULT_TAG_SEEDS: DefaultTagSeed[] = [
  {
    name: 'instruction',
    description: 'What you want the model to do.',
    placeholder: 'e.g., Summarize the document below for a non-technical audience.',
  },
  {
    name: 'context',
    description: 'Background information the model needs.',
    placeholder:
      'e.g., This is an internal engineering postmortem; the audience is the executive team.',
  },
  {
    name: 'input',
    description: 'The actual content to process.',
    placeholder: 'Paste or type the content here.',
  },
  {
    name: 'examples',
    description: 'Few-shot examples of desired behavior.',
    placeholder: 'Input: ...\nOutput: ...',
  },
  {
    name: 'output_format',
    description: 'How the response should be structured.',
    placeholder: 'e.g., Three bullet points, each under 20 words.',
  },
  {
    name: 'constraints',
    description: 'Rules, limits, or things to avoid.',
    placeholder: 'e.g., Do not include jargon. Stay under 200 words.',
  },
  {
    name: 'role',
    description: 'The persona the model should adopt.',
    placeholder: 'e.g., You are an experienced technical editor.',
  },
];

interface DefaultTemplateSeed {
  name: string;
  tagNames: string[];
}

const DEFAULT_TEMPLATE_SEEDS: DefaultTemplateSeed[] = [
  { name: 'Basic', tagNames: ['instruction', 'input'] },
  { name: 'Standard', tagNames: ['instruction', 'context', 'output_format'] },
  { name: 'Few-shot', tagNames: ['instruction', 'examples', 'input'] },
  {
    name: 'Full',
    tagNames: ['role', 'instruction', 'context', 'input', 'constraints', 'output_format'],
  },
];

export function buildDefaultAppData(): AppData {
  const tags: Tag[] = DEFAULT_TAG_SEEDS.map((seed) => ({
    id: randomUUID(),
    name: seed.name,
    description: seed.description,
    placeholder: seed.placeholder,
    isBuiltIn: true,
    isHidden: false,
  }));

  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  const templates: Template[] = DEFAULT_TEMPLATE_SEEDS.map((seed) => ({
    id: randomUUID(),
    name: seed.name,
    description: '',
    tagIds: seed.tagNames.map((n) => {
      const id = tagIdByName.get(n);
      if (!id) throw new Error(`Default template references missing tag: ${n}`);
      return id;
    }),
    isBuiltIn: true,
  }));

  return {
    version: SCHEMA_VERSION,
    tags,
    templates,
    preferences: {
      lastTemplateId: templates[0]?.id ?? null,
      drafts: {},
      windowBounds: null,
      theme: 'system',
    },
  };
}
