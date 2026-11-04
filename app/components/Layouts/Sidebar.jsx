import {
    faEnvelope,
    faUserTie,
    faChevronDown,
    faGear,
    faArrowRightFromBracket,
    faGlobe,
    faPhone,
    faHeadset,
    faD,
    faBullhorn,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonToggle from "@/components/buttons/ButtonToggle";
import React, { useEffect, useState } from "react";
import { PERMISSOES } from "@/assets/permissoes";
import Notifications from "./Notifications";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import Link from "next/link";
import { TooltipComponent } from "@/components/Layouts/TooltipComponent";
import NewBadge from "./NewBadge";
import { faCoins } from "@fortawesome/free-solid-svg-icons";

const Sidebar = ({ tabControl, subTabControl, sideBarControl, sidebarHoverControl }) => {
    const { logout, user } = useAppContext();
    const [showUserOpt, setShowUserOpt] = useState(false);
    const [toogleMenu, setToogleMenu] = useState({});
    const [sidebarFlex, setSidebarFlex] = useState(false);
    const [liberaChatbotJoinville, setLiberaChatbotJoinville] = useState(false);

    const unidadesJoinville = [1, 101, 201, 19, 119, 219, 330, 145, 45, 430];
    useEffect(() => {
        setLiberaChatbotJoinville(unidadesJoinville.includes(Number(user.cd_unid)));
    }, [user]);

    useEffect(() => {
        sidebarHoverControl(sidebarFlex);
    }, [sidebarFlex]);

    const handleLogout = () => {
        if (window.confirm("Deseja realmente sair?")) {
            logout();
        }
    };

    function getMenuOption(label, icon, onClick, hasPermission) {
        if (!hasPermission) return;
        return (
            <>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                <div
                    className={`flex flex-row hover:bg-blue-200 p-0.5 rounded select-none cursor-pointer items-center ${sideBarControl ? " " : "hidden"}`}
                    onClick={onClick}
                >
                    <div className="flex flex-col w-[24px]">
                        {icon &&
                            (typeof icon === "object" && icon.prefix && icon.iconName ? (
                                <FontAwesomeIcon icon={icon} width="16" height="16" />
                            ) : (
                                icon
                            ))}
                    </div>
                    <div className="flex flex-col w-auto text-sm md:text-base xl:text-lg">{label}</div>
                </div>
            </>
        );
    }

    function getMenuLink(label, url, icon, hasPermission) {
        if (!hasPermission) return;
        return (
            <div className={`flex flex-row hover:bg-blue-200 p-0.5 rounded select-none cursor-pointer items-center ${sideBarControl ? " " : "hidden"}`}>
                <div className="flex flex-col w-[24px]">
                    {icon && <FontAwesomeIcon icon={icon} width="16" height="16" />}
                </div>
                <div className={"flex flex-col w-auto text-sm md:text-base xl:text-lg"}>
                    <Link href={url} target="_blank">
                        {label}
                    </Link>
                </div>
            </div>
        );
    }

    function getMenuDropDown(label, id, icon, onClick, hasPermission, subMenus, newBadgeConfig) {
        if (!hasPermission) return;
        const SUB_MENUS = subMenus?.map((subMenu, index) => {
            if (subMenu?.options) {
                return (
                    <li key={`sub-${subMenu.id}-${index}`} className="rounded select-none p-0.5 cursor-pointer">
                        {getMenuDropDown(
                            subMenu.label,
                            subMenu.id,
                            "",
                            subMenu.onClick,
                            subMenu.hasPermission,
                            subMenu.options
                        )}
                    </li>

                );
            }
            if (!subMenu.hasPermission) return;
            return (
                <>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <li key={`sub-sub-${subMenu.id}-${index}`} className="hover:bg-blue-200 rounded select-none p-0.5 cursor-pointer relative" onClick={subMenu.onClick}>
                        <NewBadge
                            referenceDate={subMenu.newBadge?.referenceDate || ""}
                            days={subMenu.newBadge?.days}
                            rotate={subMenu.newBadge?.rotate}
                            size={subMenu.newBadge?.size}
                            className={subMenu.newBadge?.className}
                        />
                        {subMenu.label}
                    </li>
                </>
            );
        });
        return (
            <>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                <div key={`node-menu-${id}`} className={`flex flex-row w-full p-0.5 rounded select-none cursor-pointer items-center hover:bg-blue-200 ${sideBarControl ? "" : "hidden"}`} onClick={onClick}>
                    <div className={`flex flex-row w-full items-center relative ${toogleMenu?.[id] && "border-b border-blue-300"}`}>
                        {icon && (
                            <div className="flex flex-col w-[34px] xl:w-[28px]">
                                <FontAwesomeIcon icon={icon} width="16" height="16" />
                            </div>
                        )}
                        <div className={`flex flex-col text-sm md:text-base xl:text-lg truncate w-full`}>
                            {label}
                        </div>
                        <div className="flex items-center justify-end w-[24px]">
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                width="16"
                                height="16"
                                className={`${toogleMenu?.[id] && "rotate-180"} float-right`}
                            />
                        </div>
                        <NewBadge
                            referenceDate={newBadgeConfig?.referenceDate || ""}
                            days={newBadgeConfig?.days}
                            rotate={newBadgeConfig?.rotate}
                            size={newBadgeConfig?.size}
                            className={newBadgeConfig?.className}
                        />
                    </div>
                </div>

                <div key={`sub-menu-${id}`} className={`flex-col w-full overflow-y-auto ${toogleMenu?.[id] ? "h-auto" : "h-0"} ${sideBarControl ? "" : "hidden"}`}>
                    <ul className="list-none text-sm border-l-2 border-blue-400 pl-2">
                        {SUB_MENUS}
                    </ul>
                </div>
            </>
        );
    }

    return (
        <aside className="flex flex-col gap-y-0.5 text-primary">
            <div className="flex flex-row">
                {sideBarControl ? (
                    <div className="mx-auto w-[176px] h-[42px] relative">
                        <Image
                            src="https://www.rhbrasil.com.br/images/logos/rhbrasil/logo_rhbrasil.png"
                            alt="Logo"
                            fill
                            style={{ objectFit: "contain" }}
                            priority
                            sizes="(max-width: 640px) 120px, 176px"
                            className="w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="w-[34px] h-[34px] relative">
                        <Image
                            src="https://www.rhbrasil.com.br/images/logos/rhbrasil/icon-rhb-blue.png"
                            alt="Logo"
                            fill
                            style={{ objectFit: "contain" }}
                            priority
                            sizes="30px"
                            className="w-full h-full"
                        />
                    </div>
                )}
            </div>

            <div className={`flex flex-row font-semibold border-b-2 pb-0.5 border-slate-400 mt-1 gap-x-0.5 items-center relative ${sideBarControl ? "" : "hidden"}`}>
                <div className="grow text-base relative">
                    <span onClick={() => { printUser(); }}>
                        {user?.usr_nm?.split("@")[0]}
                    </span>
                </div>
                <TooltipComponent content={<span className="font-semibold uppercase">Opções</span>} asChild >
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div className="cursor-pointer bg-blue-200 rounded-full p-0.5 flex-none" onClick={() => { setShowUserOpt(!showUserOpt); }}>
                        <FontAwesomeIcon icon={faGear} width="16" height="16" />
                    </div>
                </TooltipComponent>
                <div
                    onMouseLeave={() => { setShowUserOpt(false); }}
                    className={`absolute gap-y-0.5 flex flex-col bg-white border border-slate-400 h-fit rounded-md p-1 text-sm -top-[-100%] w-full ${showUserOpt ? "" : "hidden"}`}>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div className="cursor-pointer hover:bg-blue-200 rounded flex flex-row w-full p-1" onClick={handleLogout}>
                        <FontAwesomeIcon icon={faArrowRightFromBracket} width="16" height="16" />
                        <span className="ml-6">Sair</span>
                    </div>
                    <div className="w-full">
                        <ButtonToggle
                            wordWrap={false}
                            primary
                            label={"Sidebar flex"}
                            checked={sidebarFlex}
                            id="sidebarFlex"
                            onChange={(id, val, checked) => {
                                setSidebarFlex(checked);
                            }}
                        />
                    </div>
                </div>
            </div>

            {getMenuLink("Web Mail", "https://webmail.rhbrasil.com.br/owa", faEnvelope, true)}

            {getMenuOption(
                "Help Desk",
                faHeadset,
                () => {
                    tabControl({
                        id: "helpdesk",
                        name: "helpdesk",
                        active: true,
                    });
                },
                [Number(user.cd_sip)].includes(4603663)
            )}

            {/* RHBSAAS LEGADO */}
            {getMenuOption(
                "RHBSaas",
                faGlobe,
                () => {
                    tabControl({
                        id: "SaasLegado",
                        name: "RHBSaas",
                        active: true,
                    });
                },
                true
            )}
            {/* RHBSAAS LEGADO */}

            {/* {links financeiro} */}
            {getMenuDropDown(
                "Financeiro",
                "financeiro",
                faCoins,
                () => {
                    setToogleMenu((prevState) => {
                        return { ...prevState, financeiro: !prevState.financeiro };
                    });
                },
                PERMISSOES.financeiro.financeiro(user.permissoes),
                [
                    {
                        label: "Bot Valida Cliente",
                        id: "BotValidaCliente",
                        onClick: () => {
                            tabControl({
                                id: "BotValidaCliente",
                                name: "BotValidaCliente",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.financeiro.BotValidaCliente(user.permissoes)
                    }
                ],
            )}

            {/* links Selecao */}
            {getMenuDropDown(
                "Seleção",
                "selecao",
                faUserTie,
                () => {
                    setToogleMenu((prevState) => {
                        return { ...prevState, selecao: !prevState.selecao };
                    });
                },
                PERMISSOES.selecao.selecao(user.permissoes),
                [
                    {
                        label: "Entrar",
                        id: "SelecaoEntrar",
                        onClick: () => {
                            tabControl({
                                id: "SelecaoEntrar",
                                name: "Seleção",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.selecao.selecaoEntrar(user.permissoes),
                    },
                    {
                        label: "Gerencial",
                        id: "SelecaoGerencial",
                        onClick: () => {
                            tabControl({
                                id: "SelecaoGerencial",
                                name: "Gerencial",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.selecao.selecaoGerencial(user.permissoes),
                    },
                    {
                        label: "Requisições",
                        id: "SelecaoRequisicoes",
                        onClick: () => {
                            tabControl({
                                id: "SelecaoRequisicoes",
                                name: "Requisições",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.selecao.selecaoRequisicoes(user.permissoes),
                    },
                    {
                        label: "Abertura de requisição",
                        id: "SelecaoAberturaRequisicao",
                        onClick: () => {
                            tabControl({
                                id: "SelecaoAberturaRequisicao",
                                name: "Abertura de requisição",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.selecao.selecaoAberturaRequisicao(
                            user.permissoes
                        ),
                    },
                    {
                        label: "Faturamento Avaliação",
                        id: "SelecaoFaturamentoAvaliacao",
                        onClick: () => {
                            setToogleMenu((prevState) => {
                                return {
                                    ...prevState,
                                    SelecaoFaturamentoAvaliacao:
                                        !prevState.SelecaoFaturamentoAvaliacao,
                                };
                            });
                        },
                        hasPermission: PERMISSOES.selecao.selecaoFaturamentoAvaliacao(
                            user.permissoes
                        ),
                        options: [
                            {
                                label: "Criar",
                                id: "SelecaoFaturamentoAvaliacaoCriar",
                                onClick: () => {
                                    tabControl({
                                        id: "SelecaoFaturamentoAvaliacaoCriar",
                                        name: "Faturamento Avaliação Criar",
                                        active: true,
                                    });
                                },
                                hasPermission: true,
                            },
                            {
                                label: "Pesquisar",
                                id: "SelecaoFaturamentoAvaliacaoPesquisa",
                                onClick: () => {
                                    tabControl({
                                        id: "SelecaoFaturamentoAvaliacaoPesquisa",
                                        name: "Faturamento Avaliação Pesquisar",
                                        active: true,
                                    });
                                },
                                hasPermission: true,
                            },
                        ],
                    },
                ]
            )}

            {/* {links Recrutamento} */}
            {getMenuDropDown(
                "Recrutamento",
                "recrutamento",
                faUserTie,
                () => {
                    setToogleMenu((prevState) => {
                        return { ...prevState, recrutamento: !prevState.recrutamento };
                    });
                },
                PERMISSOES.recrutamento.Recrutamento(user.permissoes),
                [
                    {
                        label: "Entrar",
                        id: "RecrutamentoEntrar",
                        onClick: () => {
                            tabControl({
                                id: "RecrutamentoEntrar",
                                name: "Recrutamento",
                                active: true,
                                /* newBadge: { referenceDate: '20/06/2025', className: 'absolute top-0 -right-2 !py-0', rotate: 15 } */
                            });
                        },
                        hasPermission: PERMISSOES.recrutamento.RecrutamentoEntrar(user.permissoes),
                        /* newBadge: { referenceDate: '20/06/2025', className: 'me-2 ' } */
                    },
                    {
                        label: "Autoatendimento",
                        id: "autoatendimento",
                        onClick: () => {
                            tabControl({
                                id: "recrutamentoAutoatendimento",
                                name: "Autoatendimento",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.recrutamento.Autoatendimento(user.permissoes),
                        /* newBadge: { referenceDate: '20/06/2025', className: 'me-2' } */
                    },
                ],
                /* { referenceDate: '20/06/2025', rotate: 10, className: 'absolute top-0 left-48' } */
            )}

            {/* {links Marketing} */}
            {getMenuDropDown(
                "Marketing",
                "marketing",
                faBullhorn,
                () => {
                    setToogleMenu((prevState) => {
                        return { ...prevState, marketing: !prevState.marketing };
                    });
                },
                PERMISSOES.marketing.CampanhasEndomarketing(user.permissoes),
                [
                    {
                        label: "Campanhas Endomarketing",
                        id: "CampanhasEndomarketing",
                        onClick: () => {
                            tabControl({
                                id: "CampanhasEndomarketing",
                                name: "Campanhas Endomarketing",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.marketing.CampanhasEndomarketing(user.permissoes),
                    }
                ],
            )}

            <Notifications
                usuario={user.user_sip}
                className={`${user ? "block" : "hidden"}`}
                tabControl={tabControl}
                subTabControl={subTabControl}
            />

            {/* Custos com ChatBot */}
            {/* {getMenuOption(
                "Relatório ChatBot",
                faWhatsapp,
                () => {
                    tabControl({ id: "chatbot", name: "ChatBot", active: true });
                },
                PERMISSOES.chatBot.dashboard(user.permissoes)
            )} */}

            {/* // Ramais */}
            {getMenuOption(
                "Ramais",
                faPhone,
                () => {
                    tabControl({ id: "ramais", name: "Ramais", active: true });
                },
                PERMISSOES.ramais.ramais(user.permissoes)
            )}

            {/* HORAS DAYONE */}
            {getMenuOption(
                "DayOne",
                faD,
                () => {
                    tabControl({
                        id: "HorasDev",
                        name: "DayOne",
                        active: false,
                    });
                },
                PERMISSOES.dayone.dayone(user.permissoes)
            )}
            {/* HORAS DAYONE */}

            {/* CALLCENTER */}
            {getMenuDropDown(
                "Callcenter",
                "callcenter",
                faHeadset,
                () => {
                    setToogleMenu((prevState) => {
                        return { ...prevState, callcenter: !prevState.callcenter };
                    });
                },
                PERMISSOES.recrutamento.callcenter(user.permissoes) && liberaChatbotJoinville,
                [
                    {
                        label: "Entrar",
                        id: "CallCenterEntrar",
                        onClick: () => {
                            tabControl({
                                id: "CallCenterEntrar",
                                name: "Callcenter",
                                active: true,
                            });
                        },
                        hasPermission: PERMISSOES.recrutamento.callcenter(user.permissoes),
                    }
                ]
            )}
            {/* CALLCENTER */}
        </aside>
    );
};

export default Sidebar;
