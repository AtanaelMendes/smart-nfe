import React, { useEffect } from "react";
import Button from "@/components/buttons/Button";
import { cn } from "@/assets/utils";

const ModalGrid = ({
    id,
    children,
    modalControl,
    setModalControl,
    closeModalCallback,
    closeOnSubmit,
    danger,
    warning,
    customMargin,
    height,
    scrollable = true,
    dismissible = true,
    size = "md",
    width,
    btnCancel,
    btnSubmit,
    submitCallBack,
    footerClass,
    footer,
    contentClass,
    title,
    background,
    scrollableX,
    ...props
}) => {
    const modalSizes = {
        sm: cn(height ?? "h-full md:h-1/2 lg:h-2/5", width ?? "w-full md:w-1/2 lg:w-2/5"),
        md: cn(height ?? "h-full md:h-[75%] lg:h-[65%]", width ?? "w-full md:w-[75%] lg:w-[65%]"),
        lg: cn(height ?? "h-full md:h-[85%] xl:h-[80%]", width ?? "w-full md:w-[85%] xl:w-[80%]"),
        full: "w-full h-full",
    };

    const getModalType = () => {
        if (danger) return "bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-300";
        if (warning) return "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300";
        return "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100";
    };

    const closeModal = () => {
        if (setModalControl) {
            setModalControl(false);
        }
        closeModalCallback?.();
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && dismissible) {
                closeModal();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [dismissible]);

    const CloseBtn = () => (
        <Button
            className="absolute top-3 right-3 h-8 min-h-0 w-8 rounded-full p-0"
            onClick={closeModal}
            title="Fechar modal"
        >
            <svg
                className="h-4 w-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 320 512"
            >
                <path d="M310.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L160 210.7 54.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L114.7 256 9.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 301.3 265.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L205.3 256 310.6 150.6z" />
            </svg>
        </Button>
    );

    const onClickSubmit = (e) => {
        submitCallBack?.();
        if (closeOnSubmit) closeModal();
    }

    if (!modalControl) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 ${customMargin}`}
            id={id}
            onClick={dismissible && !title ? closeModal : undefined}
        >
            <div
                className={cn(
                    "relative rounded-xl flex flex-col max-h-[calc(100dvh-2rem)] shadow-xl",
                    modalSizes[size],
                    background || "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {title && (
                    <div
                        className={cn(
                            "relative p-5 pr-14 flex justify-between items-center",
                            getModalType(),
                            size !== "full" ? "rounded-t-lg" : ""
                        )}
                    >
                        <h2 className="text-base xl:text-lg font-semibold">{title}</h2>
                        <CloseBtn />
                    </div>
                )}

                {/* Conteúdo com scroll */}
                <div
                    className={cn(
                        "flex-grow overflow-y-auto px-2 xl:px-4 mt-2",
                        scrollable ? "scroll-smooth" : "overflow-y-hidden",
                        scrollableX ? "overflow-x-auto" : "overflow-x-hidden",
                        contentClass || ""
                    )}
                >
                    {children}
                </div>

                {/* Footer */}
                {(footer || btnCancel || btnSubmit) && (
                    <div
                        className={cn("z-10 p-1 xl:p-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-end gap-2", size !== "full" ? "rounded-b-lg" : "", footerClass || "")}>
                        {btnCancel && (
                            <div>
                                <Button buttonType="danger" outline={btnSubmit} onClick={closeModal} size="small">
                                    {btnCancel || "CANCELAR"}
                                </Button>
                            </div>
                        )}
                        {btnSubmit && (
                            <div>
                                <Button buttonType="success" onClick={onClickSubmit} size="small">
                                    {btnSubmit || "SALVAR"}
                                </Button>
                            </div>
                        )}
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModalGrid;
