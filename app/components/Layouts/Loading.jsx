import { cn } from "@/assets/utils";
import Image from "next/image";

const Loading = ({ active, className }) => {
    if (!active) return null;

    return (
        <div
            className={cn(
                "flex absolute w-full h-full bg-white z-[999] top-[0px] left[0px] items-center justify-center",
                className
            )}
        >
            <div className="h-[200px] w-[180px] relative text-center">
                <Image
                    src={`https://www.rhbrasil.com.br/images/logos/rhbrasil/icon-rhb-blue.png`}
                    fill
                    className="animate-rotate-y"
                    alt="carregando"
                />
                <span className="-bottom-5 left-1/2 -translate-x-1/2 absolute font-medium">
                    Carregando...
                </span>
            </div>
        </div>
    );
};
export default Loading;
