import { Caption } from '@/components/Layouts/Typography';
import { useEffect, useState } from "react";
import { cn } from "@/assets/utils";

const ProgressBar = ({ id, width, value }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(value || 0);
    }, [value]);

    return (
        <>
            <Caption className={"me-2"}>Limite:</Caption>
            <div id={id} className={cn("bg-slate-200 dark:bg-slate-700 rounded-full h-1.5", width || "w-[200px]")}>
                {/* Usando `style={{ width: progress + '%' }}` para evitar erro no Tailwind */}
                <div
                    className={cn("bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300")}
                    style={{ width: `${Math.min(progress, 100)}%` }} // Evita que ultrapasse 100%
                ></div>
            </div>
            <span className="text-xs ml-2">{progress}%</span>
        </>
    );
};

export default ProgressBar;