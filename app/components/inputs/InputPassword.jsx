import {
  faEye,
  faEyeSlash,
  faAsterisk,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { FieldLabel } from "../Layouts/Typography";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const InputPassword = ({
  onKeyDown,
  onChange,
  onBlur,
  value,
  required,
  label,
  id,
  hint,
  maxLength,
  showTogglePassword = true,
}) => {
  const [togglePassword, setTogglePassword] = useState(true);

  const handleEnter = (evt) => {
    if (evt.key === "Enter") {
      if (typeof onKeyDown === "function") {
        onKeyDown();
      }
    }
  };

  const handleChange = (evt) => {
    if (typeof onChange === "function") {
      onChange(evt.target.id, evt.target.value);
    }
  };

  const handleBlur = (evt) => {
    if (typeof onBlur == "function") {
      onBlur(evt.target.id, evt.target.value);
    }
  };

  const hasError = () =>
    required?.hasOwnProperty("password") && required.password.error;

  function renderError() {
    if (!hasError()) return;
    let errorMsg = required?.password?.errorMsg || "Este campo é obrigatório";

    return <div className="text-xs text-red-600">{errorMsg}</div>;
  }

  return (
    <>
      {label && (
        <div className="flex relative">
          <label htmlFor={id}>
            <FieldLabel className={`${required ? "ml-4" : ""}`}>
              {label || ""}
            </FieldLabel>
          </label>
          {required && (
            <FontAwesomeIcon
              icon={faAsterisk}
              width="10"
              height="10"
              color="red"
              className="self-start absolute"
            />
          )}
          {hint && (
            <>
              <TooltipComponent
                content={
                  <div className="text-xs z-20 max-w-[300px]">{hint}</div>
                }
                asChild
              >
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  width="16"
                  height="16"
                  color="blue"
                  className="self-start ml-2"
                  tabIndex={-1}
                />
              </TooltipComponent>
            </>
          )}
        </div>
      )}

      <div className="relative">
        <input
          required
          id={id || "password"}
          value={value}
          placeholder="•••••••••"
          onKeyDown={handleEnter}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={maxLength || ""}
          type={togglePassword ? "password" : "text"}
          className={`border ${
            hasError() ? "border-red-500" : "border-gray-300"
          } text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2`}
        />
        {showTogglePassword && (
          <div
            className="right-2 top-1 absolute inset-y-0 flex items-center cursor-pointer h-[75%]"
            onClick={() => {
              setTogglePassword(!togglePassword);
            }}
          >
            <FontAwesomeIcon
              icon={togglePassword ? faEye : faEyeSlash}
              width="20"
              height="20"
              className="text-slate-500"
            />
          </div>
        )}
      </div>
      {renderError()}
    </>
  );
};
export default InputPassword;
