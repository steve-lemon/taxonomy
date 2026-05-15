import { parse as parseJsonSourceMap } from 'json-source-map';
import { validateTaxonomy, ValidationIssue } from './validation';
import { TaxonomyFile } from '../types/taxonomy';

export interface IssueWithLine extends ValidationIssue {
  line?: number;
}

function toJsonPointer(path: string): string {
  // e.g. "attributes[0].aliases" -> "/attributes/0/aliases"
  let p = path.replace(/\[(\d+)\]/g, '/$1');
  p = p.replace(/\./g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

export function validateWithLines(data: TaxonomyFile, jsonString?: string): IssueWithLine[] {
  const issues = validateTaxonomy(data);
  let pointers: any = null;

  if (jsonString) {
    try {
      const parsed = parseJsonSourceMap(jsonString);
      pointers = parsed.pointers;
    } catch (e) {
      // ignore
    }
  }

  return issues.map((issue) => {
    let line: number | undefined;
    if (pointers && issue.path) {
      const ptr = toJsonPointer(issue.path);
      const pointerData = pointers[ptr];
      if (pointerData && pointerData.key) {
        line = pointerData.key.line + 1; // 1-based
      } else if (pointerData && pointerData.value) {
        line = pointerData.value.line + 1;
      }
    }
    return { ...issue, line };
  });
}
