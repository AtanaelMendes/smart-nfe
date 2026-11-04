import React, { ReactNode } from "react";
import { DebouncedSearchContext } from ".";

/**
 * Componente que renderiza o Root do DebouncedSearch onde todos os props passados
 * são passados para os filhos.
 *
 * @author https://github.com/caiodutra08
 *
 * @returns {ReactNode} O Root do DebouncedSearch
 */
export const DebouncedSearchRoot = ({ children, ...props }) => {
    return (
        <DebouncedSearchContext.Provider value={props}>
            <>{children}</>
        </DebouncedSearchContext.Provider>
    );
};

