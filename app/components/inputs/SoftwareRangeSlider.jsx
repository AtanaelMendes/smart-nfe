import { useEffect, useState } from "react";
import RangeSlider from "@/components/inputs/RangeSlider";

const SoftwareRangeSlider = ({ value, id, label, onChange }) => {
    const [sliderValue, setSliderValue] = useState(value);

    const handleChange = (evt) => {
        if (typeof onChange == "function") {
            onChange(evt.target.id, evt.target.value);
        }
    };

    useEffect(() => {
        setSliderValue(value);
    }, [value]);

    useEffect(() => {
        if (typeof onChange == "function") {
            onChange(id, sliderValue);
        }
    }, [sliderValue]);

    return (
        <RangeSlider
            value={sliderValue}
            onChange={handleChange}
            id={id}
            label={label}
            min={1}
            max={4}
            step={1}
            enableMinMax
            renderMinMax={
                <>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(sliderValue) === 1 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer start-0`}
                        onClick={() => {
                            setSliderValue(1);
                        }}
                    >
                        Mínimo
                    </span>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(sliderValue) === 2 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer start-1/3`}
                        onClick={() => {
                            setSliderValue(2);
                        }}
                    >
                        Regular
                    </span>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(sliderValue) === 3 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer start-2/3`}
                        onClick={() => {
                            setSliderValue(3);
                        }}
                    >
                        Bom
                    </span>
                    <span
                        className={`text-xs xl:text-sm font-medium ${Number(sliderValue) === 4 ? "text-gray-900" : "text-gray-400"} -bottom-6 hover:cursor-pointer end-0`}
                        onClick={() => {
                            setSliderValue(4);
                        }}
                    >
                        Ótimo
                    </span>
                </>
            }
        />
    );
};

export default SoftwareRangeSlider;
