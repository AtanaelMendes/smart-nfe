import { DebouncedSearchRoot } from "./DebouncedSearchRoot";
import { DebouncedSearchLabel } from "./DebouncedSearchLabel";
import { DebouncedSearchSelect } from "./DebouncedSearchSelect";
import { createContext } from "react";

export const DebouncedSearchContext = createContext(null);

/**
 * DebouncedSearch. Componente para busca de dados com debounce. Quando digitado
 * texto no campo de busca do select, é feita uma requisição para buscar os dados.
 * E a cada requisição, se for feita outra, cancela a anterior.
 *
 * @version 1.0.0
 *
 * @author https://github.com/caiodutra08
 */
export const DebouncedSearch = {
    Root: DebouncedSearchRoot,
    Label: DebouncedSearchLabel,
    Select: DebouncedSearchSelect,
};
