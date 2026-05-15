# Taxonomy & Schema Builder

A powerful and intuitive web-based tool for designing, managing, and validating data schemas and taxonomy trees.

## Features

- **Categories**: Build a hierarchical taxonomy of product and conceptual categories. 
- **Attributes**: Define properties that describe categories (e.g., Color, Size, Brand), supporting different data types (enum, boolean, date, string) and cardinality for multi-value inputs.
- **Vocabularies**: Centralized dictionaries managing enum values to enforce naming consistency. Also features built-in color swatch support for color values.
- **Entities**: Define objects and relationships using visual data-model configurations.
- **Rules & Validation**: Live schema validation across terminology, alias collisions, duplicate assignments, and orphan references. Warns of alias overlap and structural logic issues instantly. 
- **Entity Preview**: Interactive form builder testing environment integrated directly alongside your schemas.
- **AI Copilot**: Integrate with Gemini via `@google/genai` to automatically suggest or build entire taxonomies, schemas, attributes, and terms based on prompts.

## Entity Model Guidelines

This project supports an advanced **Entity Model** to capture independent objects in a single scene (e.g., a photo with a 'model' wearing a 'dress' while sitting on a 'chair').
For rules on when to use entities, relation types, and what role they play, please refer to:
[Entity Model Usage Guidelines](docs/entity-model-guidelines.md)

## Tech Stack

- **React / TypeScript / Vite**
- **Zustand** - Client-side state management
- **Tailwind CSS** - Styling and typography
- **React Router** for inner-app screen navigation
- **Lucide-React** for unified iconography

## Aliases & Overrides

This editor supports intelligent 'Aliases' and 'Override Allowed Terms'.
- **Aliases**: You can declare variations for a Category, Attribute, Entity, or Term (e.g. `shirt`, `t-shirt`). A built-in validation system prevents and warns of overlap across schemas.
- **Allow Term Overrides**: Define tight constraints on wide Vocabularies specific to different categories.

## Running Locally

1. `npm install`
2. `npm run dev`
3. View at the provided local port (`3000`).
