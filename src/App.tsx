/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useTaxonomyStore } from './store/useTaxonomyStore';
import { BundlePicker } from './screens/BundlePicker';
import { AppShell } from './screens/AppShell';
import { OverviewScreen } from './screens/OverviewScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { VocabulariesScreen } from './screens/VocabulariesScreen';
import { AttributesScreen } from './screens/AttributesScreen';
import { EntitiesScreen } from './screens/EntitiesScreen';
import { RulesScreen } from './screens/RulesScreen';
import { RawScreen } from './screens/RawScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';

export default function App() {
  const { init, inited, selectedBundleKey } = useTaxonomyStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!inited) {
    return <div className="min-h-screen bg-bg-base text-ink flex items-center justify-center">Loading app state...</div>;
  }

  if (!selectedBundleKey) {
    return <BundlePicker />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<OverviewScreen />} />
          <Route path="vocabularies" element={<VocabulariesScreen />} />
          <Route path="attributes" element={<AttributesScreen />} />
          <Route path="categories" element={<CategoriesScreen />} />
          <Route path="entities" element={<EntitiesScreen />} />
          <Route path="rules" element={<RulesScreen />} />
          <Route path="raw" element={<RawScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

