# Customization Open Choices

## Decisions Already Made

- Core model: reusable highlight style templates referenced by word lists.
- Conflict model: merge non-conflicting style fields; same-field conflicts use the higher word-list priority.
- Priority model: lists shown higher in the UI have higher priority.
- Matching scope: words, fixed phrases, and simple word forms.
- Editor model: grouped advanced controls instead of arbitrary CSS.

## Deferred Visual Choices

The visual companion has mockups for:

- Direct style-on-list model.
- Reusable style-template model.
- Scene/profile-based model.
- Quick style editor.
- Grouped advanced style editor.
- CSS-like expert editor.

Current implementation uses the reusable style-template model and grouped advanced editor. The scene/profile model remains a good future layer once users have enough custom settings to justify saved presets such as "精读", "考试", and "极简".

## Future Product Questions

- Should style templates support opacity separately from color?
- Should phrase matches draw a single continuous background across spaces, or keep per-word highlight blocks?
- Should custom word-list highlights appear on already typed characters, or only pending text, in practice mode?
- Should users be able to disable a specific visual property from merging, such as allowing a lower-priority list to set underline but not background?
- Should reading and typing typography eventually diverge into separate profiles?

