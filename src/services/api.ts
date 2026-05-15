import { TaxonomyFile } from '../types/taxonomy';

const SAMPLE_BUNDLE: TaxonomyFile = {
  schema_version: "2.0.0",
  meta: {
    name: "image-metadata-taxonomy",
    updated_at: "2026-04-24T00:00:00Z"
  },
  normalization: {
    case_insensitive: true,
    trim_whitespace: true,
    unicode_normalization: "NFC",
    alias_resolution_order: [
      "attribute_alias",
      "category_alias",
      "vocabulary_term_alias"
    ],
    deprecated_policy: {
      accept_input: true,
      store_as_canonical_if_possible: true,
      warn_on_use: true
    }
  },
  rules: {
    id_unique: true,
    attribute_key_unique: true,
    search_path_unique: true,
    child_override_parent: true,
    status_values: ["active", "deprecated"],
    multi_category: {
      enabled: true,
      max_categories_per_photo: 3,
      attribute_merge_strategy: "intersection"
    }
  },
  vocabularies: [
    {
      id: "vocab_color",
      type: "color",
      status: "active",
      terms: [
        { value: "red", status: "active", color_code: "#ef4444", aliases: ["레드", "빨강"] },
        { value: "blue", status: "active", color_code: "#3b82f6", aliases: ["블루", "파랑"] },
        { value: "black", status: "active", color_code: "#000000", aliases: ["블랙", "검정"] },
        { value: "white", status: "active", color_code: "#ffffff", aliases: ["화이트", "흰색"] },
        { value: "green", status: "active", color_code: "#22c55e", aliases: ["그린", "초록"] }
      ]
    },
    {
      id: "vocab_top_type",
      status: "active",
      terms: [
        { value: "tshirt", status: "active", aliases: ["tee", "t-shirt", "티셔츠"] },
        { value: "shirt", status: "active", aliases: ["셔츠"] },
        { value: "knit", status: "active", aliases: ["니트", "sweater"] }
      ]
    },
    {
      id: "vocab_style",
      status: "active",
      terms: [
        { value: "minimal", status: "active", aliases: ["미니멀"] },
        { value: "street", status: "active", aliases: ["스트릿"] },
        { value: "casual", status: "active", aliases: ["캐주얼"] }
      ]
    },
    {
      id: "vocab_garment_type",
      status: "active",
      terms: [
        { value: "shirt", status: "active", aliases: ["셔츠"] },
        { value: "slip_dress", status: "active", aliases: ["슬립드레스", "dress"] }
      ]
    }
  ],
  attributes: [
    {
        key: "primary_color",
        label: "Primary Color",
        type: "enum",
        cardinality: "multi",
        status: "active",
        vocab_ref: "vocab_color",
        aliases: ["main_color", "메인컬러"]
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      cardinality: "single",
      status: "active",
      aliases: ["model_name", "person"]
    },
    {
        key: "top_type",
        label: "Top Type",
        type: "enum",
        cardinality: "single",
        status: "active",
        vocab_ref: "vocab_top_type",
        aliases: ["upper_type", "상의종류"]
    },
    {
        key: "style",
        label: "Style",
        type: "enum",
        cardinality: "multi",
        status: "active",
        vocab_ref: "vocab_style",
        aliases: ["mood_style", "스타일"]
    },
    {
        key: "legacy_color",
        label: "Legacy Color",
        type: "string",
        cardinality: "single",
        status: "deprecated",
        aliases: ["color_old"]
    },
    {
        key: "garment_type",
        label: "Garment Type",
        type: "enum",
        cardinality: "single",
        status: "active",
        vocab_ref: "vocab_garment_type",
        aliases: ["의류종류"]
    }
  ],
  categories: [
    {
      id: "fashion",
      name: "Fashion",
      parent_id: null,
      search_path: "fashion",
      status: "active",
      aliases: ["패션"],
      inherit_attributes: false,
      attribute_bindings: [
        { key: "primary_color", required: false, status: "active" },
        { key: "model", required: false, status: "active" },
        { key: "style", required: false, status: "active" }
      ]
    },
    {
      id: "tops",
      name: "Tops",
      parent_id: "fashion",
      search_path: "fashion/tops",
      status: "active",
      aliases: ["상의"],
      inherit_attributes: true,
      attribute_bindings: [
        { key: "top_type", required: true, status: "active" }
      ]
    },
    {
      id: "shirt",
      name: "Shirt",
      parent_id: "tops",
      search_path: "fashion/tops/shirt",
      status: "active",
      aliases: ["셔츠"],
      inherit_attributes: true,
      attribute_bindings: [
        {
          key: "top_type",
          required: true,
          status: "active",
          override: {
            allowed_terms: ["shirt"]
          }
        },
        {
          key: "legacy_color",
          required: false,
          status: "active"
        },
        {
          key: "garment_type",
          required: false,
          status: "active",
          override: {
            allowed_terms: ["shirt"]
          }
        }
      ]
    },
    {
      id: "dress",
      name: "Dress",
      parent_id: "fashion",
      search_path: "fashion/dress",
      status: "active",
      aliases: ["드레스"],
      inherit_attributes: true,
      attribute_bindings: [
        {
          key: "garment_type",
          required: true,
          status: "active",
          override: {
            allowed_terms: ["slip_dress"]
          }
        },
        {
          key: "style",
          required: false,
          status: "active"
        }
      ]
    }
  ],
  entity_model: {
    entity_types: [
      {
        id: "model",
        label: "Model Entity",
        status: "active",
        aliases: ["person"]
      },
      {
        id: "dress",
        label: "Dress Entity",
        status: "active"
      }
    ],
    relation_types: [
      {
        id: "wears",
        label: "Wears",
        status: "active",
        from_entity_type: "model",
        to_entity_type: "dress"
      }
    ]
  }
};

const BUNDLE_KEY_PREFIX = "taxonomy_bundle_";

function initSample() {
  localStorage.setItem(`${BUNDLE_KEY_PREFIX}sample`, JSON.stringify(SAMPLE_BUNDLE));
}

initSample();

export async function listBundles(): Promise<string[]> {
  // Mock delay
  await new Promise((r) => setTimeout(r, 400));
  const bundles: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BUNDLE_KEY_PREFIX)) {
      bundles.push(key.substring(BUNDLE_KEY_PREFIX.length));
    }
  }
  return bundles;
}

export async function loadJson(keyPath: string): Promise<TaxonomyFile> {
  await new Promise((r) => setTimeout(r, 400));
  const data = localStorage.getItem(`${BUNDLE_KEY_PREFIX}${keyPath}`);
  if (!data) {
    throw new Error(`Bundle not found: ${keyPath}`);
  }
  return JSON.parse(data);
}

export async function saveJson(keyPath: string, data: TaxonomyFile): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  localStorage.setItem(`${BUNDLE_KEY_PREFIX}${keyPath}`, JSON.stringify(data));
}

export async function renameBundle(oldKey: string, newKey: string, data: TaxonomyFile): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  localStorage.removeItem(`${BUNDLE_KEY_PREFIX}${oldKey}`);
  localStorage.setItem(`${BUNDLE_KEY_PREFIX}${newKey}`, JSON.stringify(data));
}

export async function deleteJson(keyPath: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  localStorage.removeItem(`${BUNDLE_KEY_PREFIX}${keyPath}`);
}
