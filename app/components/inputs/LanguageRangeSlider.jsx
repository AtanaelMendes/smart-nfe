import { numberBetween } from "@/assets/utils";
import RangeSlider from "@/components/inputs/RangeSlider";

const LanguageRangeSlider = ({ value, id, label, onChange }) => {
    const setSliderValue = (value) => {
        onChange(id, value);
    }

    return (
        <RangeSlider
            value={value}
            onChange={onChange}
            id={id}
            label={label}
            min={2}
            max={4}
            step={1}
            enableMinMax
            renderMinMax={
                <>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(value) === 2 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer start-0`}
                        onClick={() => {
                            setSliderValue(2);
                        }}
                    >
                        Intermediário
                    </span>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(value) === 3 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer start-0`}
                        onClick={() => {
                            setSliderValue(3);
                        }}
                    >
                        Avançado
                    </span>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(value) === 4 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer start-0`}
                        onClick={() => {
                            setSliderValue(4);
                        }}
                    >
                        Fluente
                    </span>
                </>
            }
        />
    );
};

export default LanguageRangeSlider;
