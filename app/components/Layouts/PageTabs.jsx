import { cn } from "@/assets/utils";
import { faRotateRight, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@/components/buttons/Button";
import { useState } from "react";
import NewBadge from "./NewBadge";

const PageTabs = ({ pageTabs, onClick, wordWrap, scrollable }) => {
    const [reload, setReload] = useState(false);

    const TABS = pageTabs?.map((tabData) => {
        return (
            <li
                key={tabData.id + "-tab"}
                className={cn(
                    "object-contain hover:bg-blue-50 dark:hover:bg-blue-400/10 mx-0.5 mt-0.5 rounded-t-md relative h-10 transition-colors duration-150",
                    tabData.active
                        ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-400/10"
                        : "border border-transparent",
                    tabData?.contador >= 0 && "mt-3",
                    tabData.visible ? "" : "hidden"
                )}
            >
                <Button
                    type="button"
                    onClick={() => {
                        handleChangeTabs(tabData.id);
                    }}
                    className={cn(
                        (!tabData.active && tabData?.blink) && "after:bg-danger after:animate-ping after:absolute after:bottom-1 after:left-4 after:rounded-t-lg after:w-1/2 after:h-3/5",
                        "relative inline-block h-10 px-3 py-0 text-sm border-b-2 rounded-t-md hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-600 dark:hover:border-blue-400 transition-colors duration-150",
                        wordWrap ? "word-wrap" : "whitespace-nowrap",
                        tabData.active
                            ? "text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-400"
                            : "text-slate-600 dark:text-slate-300 border-transparent"
                    )}
                    title={tabData.name}
                >
                    {tabData.name}
                    {tabData?.newBadge && <NewBadge
                        referenceDate={tabData?.newBadge?.referenceDate || ""}
                        days={tabData?.newBadge?.days}
                        rotate={tabData?.newBadge?.rotate}
                        size={tabData?.newBadge?.size}
                        className={tabData?.newBadge?.className}
                    />}
                </Button>

                {typeof tabData.reloadTab === "function" && Number.isNaN(Number(tabData?.contador)) &&
                    <Button
                        type="button"
                        className={`
                            bg-white dark:bg-slate-800 dark:text-slate-200 absolute -top-2 -right-1.5 rounded-full cursor-pointer p-0.5 shadow border border-transparent z-40 transition-transform duration-200 h-[18px]
                            ${tabData.active && reload ? " animate-spin " : " "}
                            ${tabData.active ? " " : " hidden"}
                        `}
                        onClick={() => {
                            handleReload(tabData);
                        }}
                        title="Reload"
                    >
                        <FontAwesomeIcon
                            icon={faRotateRight}
                            width="12"
                            height="12"
                            className="text-primary"
                        />
                    </Button>
                }

                {/* BUTTON CLOSE */}
                {typeof tabData.closeCallback === "function" &&
                    <Button
                        type="button"
                        className={`
                            text-primary
                            bg-white dark:bg-slate-800 dark:text-slate-200 absolute -top-2 -right-1.5 rounded-full cursor-pointer p-0.5 shadow border border-transparent z-40 transition-transform duration-200 h-[18px]
                        `}
                        onClick={() => {
                            tabData.closeCallback();
                        }}
                        title="Fechar"
                    >
                        <FontAwesomeIcon
                            icon={faX}
                            width="12"
                            height="12"
                        />
                    </Button>
                }

                {/* CONTADOR */}
                {tabData?.contador >= 0 && (
                    <Button
                        type="button"
                        disabled={typeof tabData.reloadTab !== "function" || !tabData.active}
                        className={cn(
                            "rounded-full p-[2px] text-white h-[18px] z-10 text-xs font-semibold absolute min-w-[18px] -top-1.5 -right-1.5 text-center shadow transition-colors duration-200 disabled:opacity-100",
                            !tabData.active ? "bg-slate-500" : "bg-red-500",
                            tabData.active && reload ? "animate-spin" : ""
                        )}
                        title={`${tabData.contador} notifications`}
                        onClick={() => {
                            handleReload(tabData);
                        }}
                    >
                        <span className={`${tabData.active && reload ? "hidden" : ""}`}>{tabData.contador}</span>
                        <FontAwesomeIcon
                            icon={faRotateRight}
                            width="12"
                            height="12"
                            className={`text-white ${tabData.active && reload ? "" : "hidden"} `}
                        />
                    </Button>
                )}
            </li>
        );
    });

    const handleChangeTabs = (idTab) => {
        setReload(false);
        if (typeof onClick === "function") {
            onClick(idTab);
        }
    }

    const handleReload = (tabData) => {
        if (!tabData.active) return;
        if (typeof tabData.reloadTab === "function") {
            tabData.reloadTab();
            setReload(true);
            setTimeout(() => {
                setReload(false);
            }, 2000);
        }
    }

    return (
        <div className={`${scrollable ? "overflow-x-auto" : "overflow-x-hidden"} overflow-y-hidden pr-2 border-b border-slate-200 dark:border-slate-700`}>
            <ul className="flex text-xs font-medium mt-[5px]">
                {TABS}
            </ul>
        </div>
    );
};

export default PageTabs;
