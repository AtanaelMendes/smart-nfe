import { cn } from "@/assets/utils";
import { faRotateRight, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import NewBadge from "./NewBadge";

const PageTabs = ({ pageTabs, onClick, wordWrap, scrollable }) => {
    const [reload, setReload] = useState(false);

    const TABS = pageTabs?.map((tabData) => {
        return (
            <li
                key={tabData.id + "-tab"}
                className={cn(
                    "object-contain hover:bg-blue-600 mx-0.5 mt-0.5 rounded-t-lg relative h-8 xl:h-10 transition-colors duration-200",
                    tabData.active
                        ? "border-yellow-300 bg-blue-600"
                        : "border border-slate-300",
                    tabData?.contador >= 0 && "mt-3",
                    tabData.visible ? "" : "hidden"
                )}
            >
                <button
                    type="button"
                    id={tabData.id + "-tab"}
                    onClick={() => {
                        handleChangeTabs(tabData.id);
                    }}
                    className={cn(
                        (!tabData.active && tabData?.blink) && "after:bg-danger after:animate-ping after:absolute after:bottom-1 after:left-4 after:rounded-t-lg after:w-1/2 after:h-3/5",
                        "relative inline-block h-8 xl:h-10 px-1 border-b-4 rounded-t-lg hover:text-white hover:drop-shadow-text-subtle-dark hover:border-yellow-300 transition-colors duration-200",
                        wordWrap ? "word-wrap" : "whitespace-nowrap",
                        tabData.active
                            ? "text-white border-yellow-300 drop-shadow-text-subtle-dark"
                            : "text-slate-600 border-slate-400"
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
                </button>

                {typeof tabData.reloadTab === "function" && Number.isNaN(Number(tabData?.contador)) &&
                    <button
                        type="button"
                        className={`
                            bg-white absolute -top-2 -right-1.5 rounded-full cursor-pointer p-0.5 shadow border border-slate-300 z-40 transition-transform duration-200 h-[18px]
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
                    </button>
                }

                {/* BUTTON CLOSE */}
                {typeof tabData.closeCallback === "function" &&
                    <button
                        type="button"
                        className={`
                            text-primary
                            bg-white absolute -top-2 -right-1.5 rounded-full cursor-pointer p-0.5 shadow border border-slate-300 z-40 transition-transform duration-200 h-[18px]
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
                    </button>
                }

                {/* CONTADOR */}
                {tabData?.contador >= 0 && (
                    <button
                        type="button"
                        disabled={typeof tabData.reloadTab !== "function" || !tabData.active}
                        className={cn(
                            "rounded-full p-[2px] text-white h-[18px] z-10 text-xs font-semibold absolute min-w-[18px] -top-1.5 -right-1.5 text-center shadow transition-colors duration-200",
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
                    </button>
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
        <div className={`${scrollable ? "overflow-x-auto" : "overflow-x-hidden"} overflow-y-hidden pr-2 shadow-md`}>
            <ul className="flex text-xs font-medium mt-[5px]">
                {TABS}
            </ul>
        </div>
    );
};

export default PageTabs;
