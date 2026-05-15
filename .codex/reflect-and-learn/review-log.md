# Review Log

## Date: 2026-05-15
- Trigger: Multi-step bug fix for vocabulary term editing and custom reading highlights.
- Reflection: The textarea bug was caused by binding the control directly to parsed terms, which stripped the blank line created by Enter and prevented real keyboard entry of multiple rows. The reading highlight path needed a UI-created list regression, not only direct localStorage setup.
- Lesson: For editable structured text, keep raw input draft separate from parsed persisted data; e2e tests should cover real keyboard input and full UI-to-reading flows.
- Scope: Project-specific candidate lesson.
- Follow-up: Keep Playwright coverage around vocabulary creation and reading rendering when extending customization features.
