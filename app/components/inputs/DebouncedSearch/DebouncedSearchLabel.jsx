import React, { useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FieldLabel } from "@/components/Layouts/Typography";
import { TooltipComponent } from "@/components/Layouts/TooltipComponent";
import { DebouncedSearchContext } from ".";

/**
 * Componente que renderiza a Label do DebouncedSearch.
 *
 * @author https://github.com/caiodutra08
 *
 * @returns {ReactNode} A label do DebouncedSearch
 */
export const DebouncedSearchLabel = ({
  label,
  labelRequired = false,
  labelClassName = "",
  hint = false,
  hintIcon,
  tooltip = false,
}) => {
  const { id } = useContext(DebouncedSearchContext);

  return (
    <label htmlFor={id} className="flex">
      <FieldLabel className={labelClassName} required={labelRequired}>
        {label || ""}
      </FieldLabel>
      {hint && (
        <>
          {tooltip ? (
            <TooltipComponent content={hint}>
              <FontAwesomeIcon
                icon={hintIcon}
                width="16"
                height="16"
                color="blue"
                className="self-start ml-2"
                tabIndex={-1}
                data-tooltip-id={`${id}_hint`}
              />
            </TooltipComponent>
          ) : (
            <FontAwesomeIcon
              icon={hintIcon}
              width="16"
              height="16"
              color="blue"
              className="self-start ml-2"
              tabIndex={-1}
              data-tooltip-id={`${id}_hint`}
            />
          )}
        </>
      )}
    </label>
  );
};
