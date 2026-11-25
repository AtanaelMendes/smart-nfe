# Taste

- Expects every UI component to be fully adapted to dark mode (dark: variants for text, backgrounds, hovers, and borders), pointing out components that still lack it as a defect. Confidence: 0.75
- Wants pages and business components to reuse the project's existing UI components (Button, Select, Input*, Checkbox, DataTable, ModalGrid/Dialog, Accordion) instead of raw native `<button>`, `<select>`, `<input>`, `<table>` or div-built modals — native markup is only acceptable inside the base UI components themselves, and a cleanup is not considered done while any raw markup remains. Confidence: 0.8
