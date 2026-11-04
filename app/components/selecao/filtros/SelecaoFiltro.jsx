import SelectCidadeFilter from "@/components/inputs/SelectCidadeFilter";
import { DebouncedSearch } from '@/components/inputs/DebouncedSearch';
import { Subtitle } from "@/components/Layouts/Typography";
import InputText from "@/components/inputs/InputText";
import InputDate from "@/components/inputs/InputDate";
import { useAppContext } from "@/context/AppContext";
import Checkbox from "@/components/inputs/Checkbox";
import { useCallback, useEffect } from "react";
import Radio from "@/components/inputs/Radio";
import { cn, empty } from "@/assets/utils";

const SelecaoFiltro = ({ filtrosPesquisa, setFiltrosPesquisa, isRecrutamento }) => {
    const setDadosFiltroPesquisaCallback = useCallback((id, value) => {
        setFiltrosPesquisa((prevState) => ({ ...prevState, [id]: value }));
    }, [setFiltrosPesquisa]);
    const { user, dashboardData, setDashboardData } = useAppContext();

    const handleChangeDashboardData = (value) => {
        setDashboardData((prevState) => ({ ...prevState, cd_pessoa_selecionador: value }));
        setFiltrosPesquisa((prevState) => ({ ...prevState, cd_pessoa_analista: value }));
    }

    return (
        <>
            <div className="flex flex-row flex-wrap gap-y-5 w-full pt-2">
                {/* CIDADE */}
                <div className="w-full">
                    <SelectCidadeFilter
                            label="Cidade"
                            id="cd_empresa"
                            placeholder="selecione"
                            value={filtrosPesquisa.cd_empresa}
                            onChange={(id, value) => {
                                setDadosFiltroPesquisaCallback(id, value);
                            }}
                        />
                </div>

                {/* CARGO */}
                <div className="w-full">
                    <InputText
                        id="nm_cargo"
                        label="Cargo"
                        value={filtrosPesquisa.nm_cargo}
                        onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    />
                </div>

                {/* NOME DA EMPRESA */}
                <div className="w-full">
                    <InputText
                        id="nm_empresa"
                        label="Nome da empresa"
                        value={filtrosPesquisa.nm_empresa}
                        onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    />
                </div>

                {/* CÓDIGO DA VAGA */}
                <div className="w-full">
                    <InputText
                        id="nr_vaga"
                        mask="numeric"
                        label="Código da vaga"
                        value={filtrosPesquisa.nr_vaga}
                        onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    />
                </div>

                {/* CENTRO DE CUSTO DA VAGA */}
                <div className="w-full">
                    <InputText
                        id="cc_vaga"
                        label="Centro de custo da vaga"
                        value={filtrosPesquisa.cc_vaga}
                        onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    />
                </div>

                {/* CÓDIGO DA REQUISIÇÃO */}
                <div className="w-full">
                    <InputText
                        mask="numeric"
                        id="nr_requisicao"
                        label="Código da requisição"
                        value={filtrosPesquisa.nr_requisicao}
                        onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    />
                </div>

            </div>

            <div className="flex flex-col w-full border-b-2 my-2 font-semibold">
                <Subtitle>Vagas</Subtitle>
            </div>
            <div className={"pt-1"}>
                <Radio
                    value={"M"}
                    id={"minhas_vagas"}
                    name={"radio_tipo_vagas"}
                    label={"Minhas Vagas"}
                    checked={filtrosPesquisa.tipo_vagas === "M"}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback("tipo_vagas", value)}
                />
            </div>
            <div className={"pt-1"}>
                <Radio
                    value={"O"}
                    id={"outras_vagas"}
                    name={"radio_tipo_vagas"}
                    label={"Vagas de Outros"}
                    checked={filtrosPesquisa.tipo_vagas === "O"}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback("tipo_vagas", value)}
                />
            </div>
            <div className={"pt-1"}>
                <Radio
                    value={"A"}
                    id={"ambas_vagas"}
                    name={"radio_tipo_vagas"}
                    label={"Ambas"}
                    checked={filtrosPesquisa.tipo_vagas === "A"}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback("tipo_vagas", value)}
                />
            </div>

            <div className="flex flex-col w-full border-b-2 my-2 font-semibold">
                <Subtitle>Área</Subtitle>
            </div>

            <div className={"pt-1"}>
                <Checkbox
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    id={"centro"}
                    label={"Centro"}
                    checked={filtrosPesquisa.centro}
                />
            </div>
            <div className={"pt-1"}>
                <Checkbox
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    id={"norte"}
                    label={"Norte"}
                    checked={filtrosPesquisa.norte}
                />
            </div>
            <div className={"pt-1"}>
                <Checkbox
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    id={"sul"}
                    label={"Sul"}
                    checked={filtrosPesquisa.sul}
                />
            </div>
            <div className={"pt-1"}>
                <Checkbox
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    id={"leste"}
                    label={"Leste"}
                    checked={filtrosPesquisa.leste}
                />
            </div>
            <div className={"pt-1"}>
                <Checkbox
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    id={"oeste"}
                    label={"Oeste"}
                    checked={filtrosPesquisa.oeste}
                />
            </div>

            <div className="flex flex-col w-full border-b-2 my-2 font-semibold">
                <Subtitle>Setor</Subtitle>
            </div>
            <div className={"pt-1"}>
                <Radio
                    value={"S"}
                    id={"recrutamento"}
                    name={"radio_setor"}
                    label={"Recrutamento"}
                    checked={filtrosPesquisa.setor === "S"}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback("setor", value)}
                />
            </div>
            <div className={"pt-1"}>
                <Radio
                    value={"N"}
                    id={"selecao"}
                    label={"Seleção"}
                    name={"radio_setor"}
                    checked={filtrosPesquisa.setor === "N"}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback("setor", value)}
                />
            </div>
            <div className={"pt-1"}>
                <Radio
                    value={"T"}
                    id={"ambos"}
                    label={"Ambos"}
                    name={"radio_setor"}
                    checked={filtrosPesquisa.setor === "T"}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback("setor", value)}
                />
            </div>

            <div className="flex flex-col w-full border-b-2 my-2 font-semibold">
                <Subtitle>PCD</Subtitle>
            </div>
            <div className="flex flex-row flex-wrap gap-x-4">
                <div className="flex flex-col">
                    <Checkbox
                        id={"somente_pcd"}
                        label={"Somente PCD"}
                        checked={filtrosPesquisa.somente_pcd}
                        onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                    />
                </div>
            </div>

            <div className="flex flex-col w-full border-b-2 my-2 font-semibold">
                <Subtitle>Abertura</Subtitle>
            </div>
            <Checkbox
                onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                id={"last_24hr"}
                label={"Vaga(s) últimas 24hrs"}
                checked={filtrosPesquisa.last_24hr}
            />

            <div className="flex flex-col w-full my-2 font-semibold">
                <InputDate
                    id="inicio"
                    label="Início"
                    value={filtrosPesquisa.inicio}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>

            <div className="flex flex-col w-full font-semibold">
                <InputDate
                    id="termino"
                    label="Término"
                    value={filtrosPesquisa.termino}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>

            <div className="flex flex-col w-full border-b-2 my-2 font-semibold">
                <Subtitle>Status</Subtitle>
            </div>
            <div className={cn("pt-1", 'comercial' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"comercial"}
                    label={"Comercial"}
                    value={filtrosPesquisa.comercial}
                    checked={filtrosPesquisa.comercial}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'prospeccao' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"prospeccao"}
                    label={"Prospecção"}
                    value={filtrosPesquisa.prospeccao}
                    checked={filtrosPesquisa.prospeccao}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'aberta' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"aberta"}
                    label={"Aberta"}
                    value={filtrosPesquisa.aberta}
                    checked={filtrosPesquisa.aberta}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'cliente' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"cliente"}
                    label={"Cliente"}
                    value={filtrosPesquisa.cliente}
                    checked={filtrosPesquisa.cliente}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'cancelada' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"cancelada"}
                    label={"Cancelada"}
                    value={filtrosPesquisa.cancelada}
                    checked={filtrosPesquisa.cancelada}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'fechada' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"fechada"}
                    label={"Fechada"}
                    value={filtrosPesquisa.fechada}
                    checked={filtrosPesquisa.fechada}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'bloqueado' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"bloqueado"}
                    label={"Bloqueado"}
                    value={filtrosPesquisa.bloqueado}
                    checked={filtrosPesquisa.bloqueado}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'canc_com_faturamento' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"canc_com_faturamento"}
                    label={"Cancelada com faturamento"}
                    value={filtrosPesquisa.canc_com_faturamento}
                    checked={filtrosPesquisa.canc_com_faturamento}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'canc_selecao_sem_candidato' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"canc_selecao_sem_candidato"}
                    label={"Cancelada com selecao sem candidato"}
                    value={filtrosPesquisa.canc_selecao_sem_candidato}
                    checked={filtrosPesquisa.canc_selecao_sem_candidato}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
            <div className={cn("pt-1", 'congelada' in filtrosPesquisa ? '' : 'hidden')}>
                <Checkbox
                    id={"congelada"}
                    label={"Congelada"}
                    value={filtrosPesquisa.congelada}
                    checked={filtrosPesquisa.congelada}
                    onChange={(id, value) => setDadosFiltroPesquisaCallback(id, value)}
                />
            </div>
        </>
    );
};

export default SelecaoFiltro;
