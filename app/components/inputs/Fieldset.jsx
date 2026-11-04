import { FieldLabel } from '@/components/Layouts/Typography';

const Fieldset = (props) => {

    return (
        <fieldset className={`flex items-center border text-gray-900 text-sm ${props.borderStyle || "rounded-lg"} w-full pt-0 p-2 border-gray-300 ${props?.className}`}>
            <legend className="px-2">
                {props?.label && <FieldLabel>{props?.label || ""}</FieldLabel>}
            </legend>
            {props.children}
        </fieldset>
    );
}
export default Fieldset;