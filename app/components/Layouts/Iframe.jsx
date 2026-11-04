import { useEffect, useState, useCallback } from "react";
import Loading from "@/components/Layouts/Loading";
import { cn } from "@/assets/utils";

const Iframe = ({ id, src, title, params, visible, active, className, callback}) => {
    const [iframSrc, setIframSrc] = useState("");
    const [ready, setReady] = useState(false);

    const updateIframeSrc = () => {
        let srcParams = "";
        if (params) {
            srcParams = new URLSearchParams(params || {}).toString();
            setIframSrc(`${process.env.NEXT_PUBLIC_BASE_URL}/${src}?${srcParams}`);
        } else {
            setIframSrc(`${process.env.NEXT_PUBLIC_BASE_URL}/${src}`);
        }
    };

    useEffect(() => {
        updateIframeSrc();
    }, [params, src]);

    const handleIframeCallback = useCallback((event) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost',
            process.env.NEXT_PUBLIC_BASE_URL
        ];
        
        if (!allowedOrigins.includes(event.origin)) return;
        const { type, payload } = event.data;
        if (typeof callback === "function") {
            callback(type, payload);
        }
    }, [callback]);

    useEffect(() => {
        window.addEventListener('message', handleIframeCallback);
        return () => {
            window.removeEventListener('message', handleIframeCallback);
        };
    }, [handleIframeCallback]);

    const renderFrame = useCallback(() => {
        if (!active) return;
        return (
            <iframe
                id={id || "iframe_component"}
                name={id || "iframe_component"}
                src={iframSrc}
                title={title}
                className={cn("w-full h-full", className)}
                onLoad={() => setReady(true)}
            />
        );
    }, [iframSrc, active]);

    return (
        <div className={`flex-col w-full h-full min-h-[400px] min-w-[400px] ${visible ? "flex" : "hidden"} relative`}>
            <Loading active={!ready} />
            {renderFrame()}
        </div>
    );
};

export default Iframe;
