import { TaxonomyFile } from '../types/taxonomy';

export type ValidationLevel = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
  path?: string;
}

export function validateTaxonomy(data: TaxonomyFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Alias tracking for duplicates
  const allAliases = new Map<string, { path: string, type: string }[]>();

  const trackAlias = (alias: string, path: string, type: string) => {
    const lower = alias.trim().toLowerCase();
    if (!lower) return;
    if (!allAliases.has(lower)) {
      allAliases.set(lower, []);
    }
    allAliases.get(lower)!.push({ path, type });
  };

  // Version format
  if (!/^\d+\.\d+\.\d+$/.test(data.schema_version)) {
    issues.push({ level: 'ERROR', code: 'INVALID_VERSION', message: 'Schema version must be SemVer (e.g., 2.0.0)', path: 'schema_version' });
  }

  // Maps for fast lookups
  const vocabIds = new Set(data.vocabularies.map(v => v.id));
  const attrKeys = new Set(data.attributes.map(a => a.key));
  const catIds = new Set(data.categories.map(c => c.id));
  const catPaths = new Set(data.categories.map(c => c.search_path));
  
  const entityTypes = new Set(data.entity_model?.entity_types.map(e => e.id) || []);

  // Rules checks
  if (data.rules.id_unique) {
    if (new Set(data.categories.map(c => c.id)).size !== data.categories.length) {
      issues.push({ level: 'ERROR', code: 'DUPLICATE_CAT_ID', message: 'Category IDs must be unique', path: 'categories' });
    }
    if (vocabIds.size !== data.vocabularies.length) {
      issues.push({ level: 'ERROR', code: 'DUPLICATE_VOCAB_ID', message: 'Vocabulary IDs must be unique', path: 'vocabularies' });
    }
  }

  if (data.rules.attribute_key_unique) {
    if (attrKeys.size !== data.attributes.length) {
      issues.push({ level: 'ERROR', code: 'DUPLICATE_ATTR_KEY', message: 'Attribute keys must be unique', path: 'attributes' });
    }
  }

  if (data.rules.search_path_unique) {
    if (catPaths.size !== data.categories.length) {
      issues.push({ level: 'ERROR', code: 'DUPLICATE_SEARCH_PATH', message: 'Category search paths must be unique', path: 'categories' });
    }
  }

  // Vocabularies
  data.vocabularies.forEach((v, vIndex) => {
    const termValues = new Set(v.terms.map(t => t.value));
    if (termValues.size !== v.terms.length) {
      issues.push({ level: 'ERROR', code: 'DUPLICATE_TERM', message: `Vocabulary ${v.id} has duplicate terms`, path: `vocabularies[${vIndex}]` });
    }
    v.terms.forEach((t, tIndex) => {
      if (t.aliases) {
        t.aliases.forEach((a) => {
          trackAlias(a, `vocabularies[${vIndex}].terms[${tIndex}].aliases`, 'term');
          if (a === t.value) {
            issues.push({ level: 'WARNING', code: 'ALIAS_COLLISION', message: `Term ${t.value} alias collides with canonical value`, path: `vocabularies[${vIndex}].terms[${tIndex}]`});
          }
        });
      }
    });
  });

  // Attributes
  data.attributes.forEach((a, aIndex) => {
    if (a.aliases) {
      a.aliases.forEach(alias => trackAlias(alias, `attributes[${aIndex}].aliases`, 'attribute'));
    }
    const isVocabType = a.type === 'enum' || a.type === 'color';
    if (isVocabType && !a.vocab_ref) {
      issues.push({ level: 'ERROR', code: 'MISSING_VOCAB_REF', message: `${a.type} attribute ${a.key} requires a vocab_ref`, path: `attributes[${aIndex}]` });
    }
    if (!isVocabType && a.vocab_ref) {
      issues.push({ level: 'ERROR', code: 'INVALID_VOCAB_REF', message: `Attribute ${a.key} of type ${a.type} must not have a vocab_ref`, path: `attributes[${aIndex}]` });
    }
    if (a.vocab_ref) {
      if (!vocabIds.has(a.vocab_ref)) {
        issues.push({ level: 'ERROR', code: 'UNKNOWN_VOCAB_REF', message: `Attribute ${a.key} references unknown vocabulary ${a.vocab_ref}`, path: `attributes[${aIndex}]` });
      } else {
        const vocab = data.vocabularies.find(v => v.id === a.vocab_ref);
        if (vocab) {
          const vocabType = vocab.type || 'string';
          if (a.type === 'color' && vocabType !== 'color') {
            issues.push({ level: 'ERROR', code: 'VOCAB_TYPE_MISMATCH', message: `Color attribute ${a.key} must reference a color vocabulary`, path: `attributes[${aIndex}]` });
          } else if (a.type === 'enum' && vocabType === 'color') {
            issues.push({ level: 'ERROR', code: 'VOCAB_TYPE_MISMATCH', message: `Enum attribute ${a.key} must not reference a color vocabulary`, path: `attributes[${aIndex}]` });
          }
        }
      }
    }
  });

  // Categories
  data.categories.forEach((c, cIndex) => {
    if (c.aliases) {
      c.aliases.forEach(alias => trackAlias(alias, `categories[${cIndex}].aliases`, 'category'));
    }
    if (c.parent_id !== null) {
      if (c.parent_id === c.id) {
        issues.push({ level: 'ERROR', code: 'SELF_PARENT', message: `Category ${c.id} cannot be its own parent`, path: `categories[${cIndex}]` });
      }
      if (!catIds.has(c.parent_id)) {
        issues.push({ level: 'ERROR', code: 'UNKNOWN_PARENT', message: `Category ${c.id} references unknown parent ${c.parent_id}`, path: `categories[${cIndex}]` });
      }
    }
    
    // Cycle check simplified manually
    let curr = c.parent_id;
    let depth = 0;
    while(curr && depth < 100) {
      const parent = data.categories.find(cat => cat.id === curr);
      if (parent && parent.id === c.id) {
        issues.push({ level: 'ERROR', code: 'CYCLE_DETECTED', message: `Cycle detected for category ${c.id}`, path: `categories[${cIndex}]` });
        break;
      }
      curr = parent ? parent.parent_id : null;
      depth++;
    }

    if (c.search_path && (c.search_path.startsWith('/') || c.search_path.endsWith('/') || c.search_path.includes('//'))) {
        issues.push({ level: 'ERROR', code: 'INVALID_SEARCH_PATH', message: `Invalid search path format for ${c.id}`, path: `categories[${cIndex}]` });
    }

    c.attribute_bindings.forEach((b, bIndex) => {
      if (!attrKeys.has(b.key)) {
        issues.push({ level: 'ERROR', code: 'UNKNOWN_ATTR_BINDING', message: `Category ${c.id} binds unknown attribute ${b.key}`, path: `categories[${cIndex}].attribute_bindings[${bIndex}]` });
      }

      const attr = data.attributes.find(a => a.key === b.key);
      if (attr && attr.status === 'deprecated') {
        issues.push({ level: 'WARNING', code: 'DEPRECATED_ATTR_BIND', message: `Category ${c.id} binds deprecated attribute ${b.key}`, path: `categories[${cIndex}].attribute_bindings[${bIndex}]` });
      }

      if (b.override && b.override.allowed_terms) {
        if (!attr || (attr.type !== 'enum' && attr.type !== 'color') || !attr.vocab_ref) {
           issues.push({ level: 'ERROR', code: 'INVALID_OVERRIDE', message: `allowed_terms restriction on ${b.key} requires an enum or color attribute with vocabulary`, path: `categories[${cIndex}].attribute_bindings[${bIndex}]` });
        } else {
           const vocab = data.vocabularies.find(v => v.id === attr.vocab_ref);
           if (vocab) {
             const vTerms = new Set(vocab.terms.map(t => t.value));
             b.override.allowed_terms.forEach(term => {
               if (!vTerms.has(term)) {
                 issues.push({ level: 'ERROR', code: 'UNKNOWN_ALLOWED_TERM', message: `allowed_term '${term}' not found in vocabulary ${vocab.id}`, path: `categories[${cIndex}].attribute_bindings[${bIndex}]` });
               }
             });
           }
        }
      }
    });
  });

  // Entity Model
  if (data.entity_model) {
     data.entity_model.entity_types.forEach((e, eIndex) => {
       if (e.aliases) {
         e.aliases.forEach(alias => trackAlias(alias, `entity_model.entity_types[${eIndex}].aliases`, 'entity_type'));
       }
     });
     data.entity_model.relation_types.forEach((r, rIndex) => {
       if (r.aliases) {
         r.aliases.forEach(alias => trackAlias(alias, `entity_model.relation_types[${rIndex}].aliases`, 'relation_type'));
       }
        if (!entityTypes.has(r.from_entity_type)) {
           issues.push({ level: 'ERROR', code: 'UNKNOWN_FROM_ENTITY', message: `Relation ${r.id} from_entity_type unknown`, path: `entity_model.relation_types[${rIndex}]` });
        }
        if (!entityTypes.has(r.to_entity_type)) {
           issues.push({ level: 'ERROR', code: 'UNKNOWN_TO_ENTITY', message: `Relation ${r.id} to_entity_type unknown`, path: `entity_model.relation_types[${rIndex}]` });
        }
     });
  }

  // Find duplicate aliases
  allAliases.forEach((usages, alias) => {
    if (usages.length > 1) {
      usages.forEach(usage => {
        issues.push({
          level: 'WARNING',
          code: 'DUPLICATE_ALIAS',
          message: `Alias '${alias}' is used multiple times.`,
          path: usage.path
        });
      });
    }
  });

  return issues;
}
