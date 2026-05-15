# Custom Word Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom word lists with reusable highlight styles and shared reading/typing typography settings.

**Architecture:** Keep matching and style merging in a pure `customization` service, persistence in `storageService`, and rendering integration in `useTextRendering`. Add one management page and minimal tooltip actions rather than scattering settings across multiple pages.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Vitest.

---

### Task 1: Pure Customization Service

**Files:**
- Create: `src/services/customization.ts`
- Create: `src/services/customization.test.ts`
- Modify: `src/types/index.ts`

- [ ] Write failing tests for word matching, phrase matching, form matching, and priority style merging.
- [ ] Add TypeScript types for `HighlightStyle`, `HighlightStyleConfig`, `WordList`, `WordListTerm`, `TypographySettings`, and `ResolvedWordHighlight`.
- [ ] Implement term normalization, simple stems, phrase matching, style merging, and CSS style conversion.
- [ ] Run `npm test -- src/services/customization.test.ts`.

### Task 2: Storage And Backup

**Files:**
- Modify: `src/services/storage.ts`
- Modify: `src/services/storage.test.ts`
- Modify: `src/services/exportImport.ts`
- Modify: `src/services/exportImport.test.ts`

- [ ] Write failing tests for default styles, empty lists, add-term dedupe, and backup import/export coverage.
- [ ] Add storage methods for styles and word lists.
- [ ] Add custom data to full export/import.
- [ ] Run affected service tests.

### Task 3: Rendering Integration

**Files:**
- Modify: `src/hooks/useTextRendering.ts`
- Modify: `src/hooks/useTextRendering.test.ts`
- Modify: `src/components/PracticeEditor.tsx`
- Modify: `src/pages/Reading.tsx`
- Modify: `src/pages/Practice.tsx`

- [ ] Write failing hook test proving custom highlight styles are returned for matching words.
- [ ] Add `customHighlightStyles` to `useTextRendering`.
- [ ] Apply custom highlight styles to reading word spans.
- [ ] Apply custom highlight styles to pending typing word spans without overriding correct/incorrect/current feedback.
- [ ] Add a local revision trigger so tooltip additions refresh highlights.

### Task 4: UI

**Files:**
- Create: `src/pages/Vocabulary.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/NavigationBar.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/WordTooltip.tsx`

- [ ] Add the `词表` route and navigation item.
- [ ] Build word-list management with enable, priority, style selection, match-forms toggle, and terms textarea.
- [ ] Build style-template editor with constrained controls and live preview.
- [ ] Add shared typography and custom highlight settings to the settings panel.
- [ ] Add tooltip controls for adding clicked words/phrases to a word list.

### Task 5: Verification

**Files:**
- No production files unless verification reveals defects.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start dev server and perform browser smoke checks for vocabulary page, reading highlights, typing highlights, and typography settings.
- [ ] Update visual mockups or notes for unresolved decisions.

