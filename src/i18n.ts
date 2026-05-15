import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "overview.title": "Taxonomy Overview",
      "overview.stats.vocabularies": "Vocabularies",
      "overview.stats.categories": "Categories",
      "overview.stats.attributes": "Attributes",
      "overview.stats.entity_types": "Entity Types",
      "overview.stats.relation_types": "Relation Types",
      "overview.validation.title": "Validation Status",
      "overview.validation.no_issues": "All clear!",
      "overview.validation.no_issues_desc": "No validation issues found in this bundle.",
      "overview.validation.errors": "{{count}} Errors",
      "overview.validation.warnings": "{{count}} Warnings",
      "app.sidebar.overview": "Overview",
      "app.sidebar.vocabularies": "Vocabularies",
      "app.sidebar.attributes": "Attributes",
      "app.sidebar.categories": "Categories",
      "app.sidebar.entities": "Entity Model",
      "app.sidebar.rules": "Rules & Norm.",
      "app.sidebar.raw": "Raw Editor",
      "app.header.save": "Save",
      "app.header.discard": "Discard",
      "app.header.no_errors": "No Errors",
      "auto_classification.title": "Auto Classification",
    }
  },
  ko: {
    translation: {
      "overview.title": "분류 체계 개요",
      "overview.stats.vocabularies": "어휘(Vocabularies)",
      "overview.stats.categories": "카테고리",
      "overview.stats.attributes": "속성",
      "overview.stats.entity_types": "엔터티 타입",
      "overview.stats.relation_types": "관계 타입",
      "overview.validation.title": "유효성 검사 상태",
      "overview.validation.no_issues": "문제 없음!",
      "overview.validation.no_issues_desc": "이 번들에서 유효성 검사 문제가 발견되지 않았습니다.",
      "overview.validation.errors": "오류 {{count}}개",
      "overview.validation.warnings": "경고 {{count}}개",
      "app.sidebar.overview": "개요",
      "app.sidebar.vocabularies": "어휘",
      "app.sidebar.attributes": "속성",
      "app.sidebar.categories": "카테고리",
      "app.sidebar.entities": "엔터티 모델",
      "app.sidebar.rules": "규칙 & 정규화",
      "app.sidebar.raw": "원시 편집기",
      "app.header.save": "저장",
      "app.header.discard": "취소",
      "app.header.no_errors": "오류 없음",
      "auto_classification.title": "자동 분류",
    }
  }
};

const savedLanguage = localStorage.getItem('app_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
