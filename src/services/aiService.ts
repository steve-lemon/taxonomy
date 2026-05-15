/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { TaxonomyFile } from '../types/taxonomy';

// Helper to determine API key
function getGeminiApiKey() {
  // @ts-ignore - The platform injects this into the build
  const envKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!envKey) {
    return "";
  }
  return envKey;
}

const TAXONOMY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      schema_version: { type: Type.STRING },
      meta: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          updated_at: { type: Type.STRING }
        },
        required: ["name", "updated_at"]
      },
      vocabularies: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["string", "color"] },
            status: { type: Type.STRING, enum: ["active", "deprecated"] },
            terms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  value: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["active", "deprecated"] },
                  aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                  color_code: { type: Type.STRING }
                },
                required: ["value", "status"]
              }
            }
          },
          required: ["id", "status", "terms"]
        }
      },
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            key: { type: Type.STRING },
            label: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["string", "number", "boolean", "enum", "color"] },
            cardinality: { type: Type.STRING, enum: ["single", "multi"] },
            status: { type: Type.STRING, enum: ["active", "deprecated"] },
            aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocab_ref: { type: Type.STRING }
          },
          required: ["key", "label", "type", "cardinality", "status"]
        }
      },
      categories: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            parent_id: { type: Type.STRING, nullable: true },
            search_path: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["active", "deprecated"] },
            aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
            inherit_attributes: { type: Type.BOOLEAN },
            attribute_bindings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  status: { type: Type.STRING, enum: ["active", "deprecated"] },
                  override: {
                    type: Type.OBJECT,
                    properties: {
                      allowed_terms: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                },
                required: ["key", "required", "status"]
              }
            }
          },
          required: ["id", "name", "search_path", "status", "inherit_attributes", "attribute_bindings"]
        }
      },
      entity_model: {
        type: Type.OBJECT,
        properties: {
          entity_types: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["active", "deprecated"] },
                aliases: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "label", "status"]
            }
          },
          relation_types: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["active", "deprecated"] },
                from_entity_type: { type: Type.STRING },
                to_entity_type: { type: Type.STRING },
                aliases: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "label", "status", "from_entity_type", "to_entity_type"]
            }
          }
        },
        required: ["entity_types", "relation_types"]
      },
      normalization: {
        type: Type.OBJECT,
        properties: {
          case_insensitive: { type: Type.BOOLEAN },
          trim_whitespace: { type: Type.BOOLEAN },
          unicode_normalization: { type: Type.STRING, enum: ["NFC", "NFD", "NFKC", "NFKD"] },
          alias_resolution_order: {
            type: Type.ARRAY,
            items: { type: Type.STRING, enum: ["attribute_alias", "category_alias", "vocabulary_term_alias"] }
          },
          deprecated_policy: {
            type: Type.OBJECT,
            properties: {
              accept_input: { type: Type.BOOLEAN },
              store_as_canonical_if_possible: { type: Type.BOOLEAN },
              warn_on_use: { type: Type.BOOLEAN }
            },
            required: ["accept_input", "store_as_canonical_if_possible", "warn_on_use"]
          }
        },
        required: ["case_insensitive", "trim_whitespace", "unicode_normalization", "alias_resolution_order", "deprecated_policy"]
      },
      rules: {
        type: Type.OBJECT,
        properties: {
          id_unique: { type: Type.BOOLEAN },
          attribute_key_unique: { type: Type.BOOLEAN },
          search_path_unique: { type: Type.BOOLEAN },
          child_override_parent: { type: Type.BOOLEAN },
          status_values: { type: Type.ARRAY, items: { type: Type.STRING } },
          multi_category: {
            type: Type.OBJECT,
            properties: {
              enabled: { type: Type.BOOLEAN },
              max_categories_per_photo: { type: Type.NUMBER },
              attribute_merge_strategy: { type: Type.STRING, enum: ["union", "intersection", "priority"] }
            },
            required: ["enabled", "max_categories_per_photo", "attribute_merge_strategy"]
          }
        },
        required: ["id_unique", "attribute_key_unique", "search_path_unique", "child_override_parent", "status_values", "multi_category"]
      }
    },
    required: ["schema_version", "meta", "vocabularies", "attributes", "categories", "normalization", "rules"]
  };

export type GenerativeModelType = 'gemini-2.5-pro' | 'gemini-2.5-flash';

export async function generateTaxonomyFromAi(
  purpose: string,
  base64Images: string[],
  model: GenerativeModelType,
  language: string = 'English'
): Promise<TaxonomyFile> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY environment variable is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  
   const prompt = `
You are an expert, meticulous data architect and taxonomy designer. Your goal is to design a robust, well-structured taxonomy bundle for the following domain/purpose:
"${purpose}"
${language ? `\nMake sure the primary language of the taxonomy (labels, terms, descriptions, names) is: ${language}.` : ""}
${base64Images.length > 0 ? "\nThe user has provided reference images representing the domain. Analyze them to extract relevant categories, attributes, and terms." : ""}

Design a comprehensive taxonomy and output it strictly in the requested JSON format.

### Requirements & Structure Guidelines:
1. Vocabularies: Create 3-7 vocabularies (e.g., colors, materials, brands) with 5-15 terms each.
   - Each term must be unique within its vocabulary.
   - Example 'terms' array item: { "value": "Cotton", "aliases": ["Organic Cotton", "Pima Cotton"], "color_code": "" }

2. Attributes: Define 5-15 attributes representing properties in this domain. Link attributes to vocabularies using \`vocab_ref\` where applicable.
   - Set appropriate types (string, enum, boolean, color).
   - If type is "enum", \`vocab_ref\` is REQUIRED. If type is NOT "enum", \`vocab_ref\` MUST BE OMITTED.
   - Example attribute: { "key": "material", "type": "enum", "label": "Material", "vocab_ref": "materials", "cardinality": "multi", "aliases": ["fabric", "composition"] }

3. Categories: Create a deep, structured hierarchy (3-5 levels if possible) of at least 15-30 categories.
   - Think fundamentally about the domain (e.g., L1: Broad Section, L2: Category, L3: Sub-category, L4: Specific Item).
   - Use \`parent_id\` to build the hierarchy. Let root categories have \`parent_id: null\`. Every \`parent_id\` MUST exactly match an \`id\` of another category in the list.
   - \`search_path\` MUST NOT start with a slash and follow the format \`parent_name/child_name/grandchild_name\`.
   - Attribute Bindings: THIS IS CRITICAL. Bind attributes to categories where they logically apply. Ensure lower-level specific categories inherit or bind to specific features.
     - For example, bind "Color" and "Size" to "Clothing", but "Resolution" and "Screen Size" to "Televisions".
     - Every bound attribute \`key\` MUST exist in the attribute list. Make essential attributes required (e.g., \`required: true\`).
   - \`id\` and \`search_path\` values across all categories MUST be unique.
   - Example category: { "id": "t_shirts", "parent_id": "shirts", "name": "T-Shirts", "search_path": "Clothing/Shirts/T-Shirts", "attribute_bindings": [{ "key": "material", "required": true }, { "key": "color", "required": false }, { "key": "size", "required": true }], "aliases": ["Tees"] }

4. Entity Model (Optional): If the domain includes distinct objects inside a single image (e.g., "model wears dress", "product on table") that need their own categories and attributes independently from the overall photo metadata, define 2-3 entity types and relationships.
   - Entity Types (e.g., "model", "dress", "chair") should be broad physical roles, not specific descriptors like "blue_dress" (which is just a "dress" with category/attributes).
   - Relation Types (e.g., "wears", "placed_on") should be concrete edges. Every \`from_entity_type\` and \`to_entity_type\` MUST exactly match an \`id\` in \`entity_types\`.
   - Do NOT use entity types for photo-level metadata (like mood, night/day). Keep that as regular attributes/categories.

5. Base Properties:
   - \`schema_version\` must be "2.0.0".
   - Keys and IDs MUST use snake_case (e.g., 'item_type', 'clothing_tops'). They must be unique.
   - 'name' and 'label' should be human-readable, Title Case.
   - 'status' should generally be "active".
   - Include 'aliases' for common synonyms.

Ensure logical consistency. If a category binds an attribute, that attribute must exist in the 'attributes' array. If an attribute uses a 'vocab_ref', that vocabulary must exist in the 'vocabularies' array.
`;

  const contents = [];
  
  // Add images to contents if any
  for (const img of base64Images) {
    // img is expected to be a data URL like: data:image/png;base64,iVBORw0KGgo...
    const match = img.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contents.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  contents.push(prompt);

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: TAXONOMY_SCHEMA as any,
    }
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response from AI");
  }

  try {
    const data = JSON.parse(responseText);
    // basic fixups
    if (!data.meta) data.meta = { name: "generated-taxonomy", updated_at: new Date().toISOString() };
    if (!data.rules) data.rules = { id_unique: true, attribute_key_unique: true };
    if (!data.normalization) data.normalization = { case_insensitive: true, trim_whitespace: true };
    if (!data.categories) data.categories = [];
    if (!data.vocabularies) data.vocabularies = [];
    if (!data.attributes) data.attributes = [];
    
    // Ensure inner arrays exist to prevent mapping errors
    data.vocabularies.forEach((v: any) => {
      if (!v.terms) v.terms = [];
      v.terms.forEach((t: any) => {
        if (!t.aliases) t.aliases = [];
      });
    });
    
    data.categories.forEach((c: any) => {
      if (!c.aliases) c.aliases = [];
      if (!c.attribute_bindings) c.attribute_bindings = [];
      if (!c.search_path) c.search_path = c.id || "";
    });
    
    data.attributes.forEach((a: any) => {
      if (!a.aliases) a.aliases = [];
    });
    
    if (data.entity_model) {
      if (!data.entity_model.entity_types) data.entity_model.entity_types = [];
      if (!data.entity_model.relation_types) data.entity_model.relation_types = [];
      data.entity_model.entity_types.forEach((e: any) => {
        if (!e.aliases) e.aliases = [];
      });
      data.entity_model.relation_types.forEach((r: any) => {
        if (!r.aliases) r.aliases = [];
      });
    }

    return data as TaxonomyFile;
  } catch (err: any) {
    throw new Error("Failed to parse the AI response as JSON: " + err.message);
  }
}

export async function modifyTaxonomyFromAi(
  currentTaxonomy: TaxonomyFile,
  userRequest: string,
  model: GenerativeModelType
): Promise<TaxonomyFile> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY environment variable is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert taxonomy designer. The user has a taxonomy and wants to make some modifications based on their request.
User request: "${userRequest}"

Current Taxonomy:
${JSON.stringify(currentTaxonomy, null, 2)}

Return the COMPLETE updated taxonomy based on the user's request. DO NOT remove things unless requested. Add or update items organically to reflect the requested domain better. Output the taxonomy strictly in the JSON format following the schema.

Important: If the user requests updates to the Entity Model:
- Use \`entity_model\` ONLY for independent objects in an image (e.g., model, dress, chair) that need separate categories/attributes. Do not use for photo-level metadata (mood, style, etc.).
- \`entity_types\` should be stable, low-cardinality physical roles, not specific descriptors like "blue_dress".
- \`relation_types\` should represent concrete edges (e.g., "wears", "placed_on"), not vague relations like "related_to".

`;


  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: TAXONOMY_SCHEMA as any,
    }
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response from AI");
  }

  try {
    const data = JSON.parse(responseText);
    // basic fixups
    if (!data.meta) data.meta = { name: "generated-taxonomy", updated_at: new Date().toISOString() };
    if (!data.rules) data.rules = { id_unique: true, attribute_key_unique: true };
    if (!data.normalization) data.normalization = { case_insensitive: true, trim_whitespace: true };
    if (!data.categories) data.categories = [];
    if (!data.vocabularies) data.vocabularies = [];
    if (!data.attributes) data.attributes = [];
    
    // Ensure inner arrays exist
    data.vocabularies.forEach((v: any) => {
      if (!v.terms) v.terms = [];
      v.terms.forEach((t: any) => {
        if (!t.aliases) t.aliases = [];
      });
    });
    
    data.categories.forEach((c: any) => {
      if (!c.aliases) c.aliases = [];
      if (!c.attribute_bindings) c.attribute_bindings = [];
      if (!c.search_path) c.search_path = c.id || "";
    });
    
    data.attributes.forEach((a: any) => {
      if (!a.aliases) a.aliases = [];
    });
    
    if (data.entity_model) {
      if (!data.entity_model.entity_types) data.entity_model.entity_types = [];
      if (!data.entity_model.relation_types) data.entity_model.relation_types = [];
      data.entity_model.entity_types.forEach((e: any) => {
        if (!e.aliases) e.aliases = [];
      });
      data.entity_model.relation_types.forEach((r: any) => {
        if (!r.aliases) r.aliases = [];
      });
    }

    return data as TaxonomyFile;
  } catch (err: any) {
    throw new Error("Failed to parse the AI response as JSON: " + err.message);
  }
}

export interface ClassificationResult {
  photo_metadata: {
    category_ids: string[];
    attributes: { key: string; value: string }[];
  };
  entities: {
    id: string;
    type: string;
    category_ids: string[];
    attributes: { key: string; value: string }[];
  }[];
  relations: {
    type: string;
    from_entity_id: string;
    to_entity_id: string;
  }[];
}

export async function classifyImage(
  base64Image: string,
  currentTaxonomy: TaxonomyFile,
  model: GenerativeModelType = 'gemini-2.5-flash'
): Promise<ClassificationResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY environment variable is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      photo_metadata: {
        type: Type.OBJECT,
        properties: {
          category_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
          attributes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                value: { type: Type.STRING }
              },
               required: ["key", "value"]
            }
          }
        },
        required: ["category_ids", "attributes"]
      },
      entities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING },
            category_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
            attributes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["key", "value"]
              }
            }
          },
          required: ["id", "type", "category_ids", "attributes"]
        }
      },
      relations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            from_entity_id: { type: Type.STRING },
            to_entity_id: { type: Type.STRING }
          },
          required: ["type", "from_entity_id", "to_entity_id"]
        }
      }
    },
    required: ["photo_metadata", "entities", "relations"]
  };

  const promptText = `
You are an expert AI classifier. You are given an image and a Taxonomy schema.
Your task is to classify and extract metadata/entities from the image using STRICTLY the provided taxonomy.

Rules:
1. ONLY use category IDs that exist in the taxonomy.
2. ONLY use attribute keys that exist in the taxonomy's attributes.
3. For enum/color attributes, ONLY use terms that exist in the referenced vocabulary.
4. If the taxonomy contains an entity_model with entity_types, extract prominent objects that match those types into the "entities" array. Give each real-world object a unique "id" (e.g. "ent_01").
5. Only extract "relations" if relation_types are defined in the taxonomy. "from_entity_id" and "to_entity_id" must refer to the IDs of the objects in your "entities" array.

Taxonomy:
${JSON.stringify(currentTaxonomy, null, 2)}
`;

  const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid base64 image format");

  const contents: any[] = [
    {
      role: 'user',
      parts: [
        { text: promptText },
        { inlineData: { mimeType: match[1], data: match[2] } }
      ]
    }
  ];

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA as any,
    }
  });

  const responseText = response.text;
  if (!responseText) throw new Error("Empty response from AI");
  
  return JSON.parse(responseText) as ClassificationResult;
}

export interface AIModificationResponse {
  plan: string;
  new_taxonomy: TaxonomyFile;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function analyzeAndModifyTaxonomy(
  currentTaxonomy: TaxonomyFile,
  userRequest: string,
  model: GenerativeModelType,
  base64Images: string[] = [],
  chatHistory: ChatMessage[] = []
): Promise<AIModificationResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY environment variable is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      plan: { 
        type: Type.STRING, 
        description: "A friendly, concise summary of the changes you will make based on the user's intent." 
      },
      new_taxonomy: TAXONOMY_SCHEMA
    },
    required: ["plan", "new_taxonomy"]
  };

  const promptText = `
You are an expert taxonomy designer.
User request / additional requirements: "${userRequest}"
${base64Images.length > 0 ? "The user has provided reference images representing their intended bundle/domain. Please analyze the images to extract relevant categories, attributes, and terms to improve the taxonomy." : ""}

Current Taxonomy:
${JSON.stringify(currentTaxonomy, null, 2)}

Instructions:
1. Analyze the user's request carefully. Consider the bundle's purpose and any attached images.
2. If the user asks for suggestions or improvements, review the Current Taxonomy and proactively identify areas that can be improved (e.g., adding missing attributes, refining categories, adding new vocabularies, or fixing relationships).
3. When recommending or modifying the Entity Model, follow these strict rules:
   - Use \`entity_model\` ONLY for independent objects in an image (e.g., model, dress, chair) that need separate categories/attributes. Do not use for photo-level metadata (mood, style, etc.).
   - \`entity_types\` should be stable, low-cardinality physical roles, not specific descriptors like "blue_dress" (that's a category + attribute).
   - \`relation_types\` should represent concrete edges (e.g., "wears", "placed_on"), not vague relations like "related_to".
4. Formulate a friendly explanation in 'plan' of what will be added, modified or suggested. Explain *why* these changes improve the taxonomy.
5. Return the complete updated taxonomy in 'new_taxonomy' incorporating these changes. Do not remove existing items unless explicitly asked.
`;

  const userParts: any[] = [{ text: promptText }];
  for (const img of base64Images) {
    const match = img.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      userParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  const contents: any[] = [
    // Include the last 5 messages from chat history for context
    ...chatHistory.slice(-5).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user', // strictly follow roles
      parts: [{ text: msg.text }]
    })),
    // Current turn
    {
      role: 'user',
      parts: userParts
    }
  ];

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA as any,
    }
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response from AI");
  }

  try {
    const data = JSON.parse(responseText);
    const tax = data.new_taxonomy;
    
    // basic fixups
    if (!tax.meta) tax.meta = { name: "generated-taxonomy", updated_at: new Date().toISOString() };
    if (!tax.rules) tax.rules = { id_unique: true, attribute_key_unique: true };
    if (!tax.normalization) tax.normalization = { case_insensitive: true, trim_whitespace: true };
    if (!tax.categories) tax.categories = [];
    if (!tax.vocabularies) tax.vocabularies = [];
    if (!tax.attributes) tax.attributes = [];
    
    tax.vocabularies.forEach((v: any) => {
      if (!v.terms) v.terms = [];
      v.terms.forEach((t: any) => {
        if (!t.aliases) t.aliases = [];
      });
    });
    
    tax.categories.forEach((c: any) => {
      if (!c.aliases) c.aliases = [];
      if (!c.attribute_bindings) c.attribute_bindings = [];
      if (!c.search_path) c.search_path = c.id || "";
    });
    
    tax.attributes.forEach((a: any) => {
      if (!a.aliases) a.aliases = [];
    });
    
    if (tax.entity_model) {
      if (!tax.entity_model.entity_types) tax.entity_model.entity_types = [];
      if (!tax.entity_model.relation_types) tax.entity_model.relation_types = [];
      tax.entity_model.entity_types.forEach((e: any) => {
        if (!e.aliases) e.aliases = [];
      });
      tax.entity_model.relation_types.forEach((r: any) => {
        if (!r.aliases) r.aliases = [];
      });
    }

    return {
      plan: data.plan,
      new_taxonomy: tax as TaxonomyFile
    };
  } catch (err: any) {
    throw new Error("Failed to parse the AI response as JSON: " + err.message);
  }
}
