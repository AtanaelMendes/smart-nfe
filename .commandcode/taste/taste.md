# Taste

- Expects every UI component to be fully adapted to dark mode (dark: variants for text, backgrounds, hovers, borders, placeholders, disabled and error/helper states), pointing out individual files that still lack it as a defect to fix on the spot. Confidence: 0.85
- Field labels must come from the base input components' `label` prop (InputText, InputNumber, InputEmail, InputPassword, InputDate, InputTextArea, Select, Checkbox) rather than a separate external `<label>`, `<span>` or `<div>`; text, ids, required markers, hint/helperText stay preserved. Confidence: 0.8
- Wants pages and business components to reuse the project's existing UI components (Button, Select, Input*, Checkbox, DataTable, ModalGrid/Dialog, Accordion) instead of raw native `<button>`, `<select>`, `<input>`, `<table>` or div-built modals — native markup is only acceptable inside the base UI components themselves, and a cleanup is not considered done while any raw markup remains. Confidence: 0.85
- Communicates in Brazilian Portuguese and expects replies, explanations and progress reports in Portuguese. Confidence: 0.7
