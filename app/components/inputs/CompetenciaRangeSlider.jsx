import { useEffect, useState } from "react";
import RangeSlider from "@/components/inputs/RangeSlider";

const CompetenciaRangeSlider = ({ value, id, label, onChange }) => {
    const [sliderValue, setSliderValue] = useState(1);

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
            max={10}
            step={1}
            enableMinMax
            renderMinMax={
                <>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer start-0"
                        onClick={() => {
                            setSliderValue(1);
                        }}
                    >
                        1
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer start-[33%] -translate-x-1/2"
                        onClick={() => {
                            setSliderValue(2);
                        }}
                    >
                        2
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer start-[66%] -translate-x-1/2"
                        onClick={() => {
                            setSliderValue(3);
                        }}
                    >
                        3
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(4);
                        }}
                    >
                        4
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(5);
                        }}
                    >
                        5
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(6);
                        }}
                    >
                        6
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(7);
                        }}
                    >
                        7
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(8);
                        }}
                    >
                        8
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(9);
                        }}
                    >
                        9
                    </span>
                    <span
                        className="text-sm font-medium text-gray-900 -bottom-6 hover:cursor-pointer end-0"
                        onClick={() => {
                            setSliderValue(10);
                        }}
                    >
                        10
                    </span>
                </>
            }
        />
    );
};

export default CompetenciaRangeSlider;
