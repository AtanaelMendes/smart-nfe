import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { useAppContext } from "@/context/AppContext";
import axiosInstance from "@/plugins/axios";
import { empty } from "@/assets/utils";

const Select2Vaga = ({ tipoVaga, placeholder, isClearable, value, ...props }) => {
    const { toast, user } = useAppContext();
    const [filter, setfilter] = useState("");
    const [selectedOption, setSelectedOption] = useState(null);
    const [vagas, setVagas] = useState([]);
    const [options, setOptions] = useState([]);

    const handleChange = (evt) => {
        setSelectedOption({ value: evt?.value || "", label: evt?.label || "" });
        setfilter("");

        if (typeof props.onChange === "function") {
            props.onChange(evt?.value || "");
        }
    };

    useEffect(() => {
        if (empty(value)) {
            setSelectedOption({ value: "", label: "" });
        }
    }, [value]);

    useEffect(() => {
        if (filter.length >= 3) {
            switch (tipoVaga) {
                case 'vagas_selecao':
                    getVagasSelecao();
                    break;
                default:
                    getVagasAnalista();
                    break;
            }
        }
        setVagas([]);
    }, [filter]);

    const getVagasSelecao = () => {
        const params = {
            tipo_vaga: 'A',
            cd_empresa: 1,
            setor: 'T',
            aberta: true,
            cd_pessoa_analista: user.cd_sip,
            sip_analista: user.user_sip,
            nm_empresa: filter,
            nm_cargo: filter
        };

        const filtrosJoin = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join("&");

        setTimeout(() => {
            axiosInstance.get(`vaga/vagas-selecao-relacionar?${filtrosJoin}`)
                .then((response) => {
                    setVagas(response.data);
                }).catch((error) => {
                    toast.error("Não foi possível carregar as vagas.");
                    console.error(error);
                });
        }, 1500);
    }

    const getVagasAnalista = () => {
        axiosInstance.get(`vaga/vagas-atendimento/${user.cd_sip}/${filter}`)
            .then((response) => {
                setVagas(response.data);
            }).catch((error) => {
                toast.error("Não foi possível carregar as vagas.");
                console.error(error);
            });
    };

    useEffect(() => {
        setOptions(
            vagas?.map((vaga) => {
                return {
                    value: vaga.NR_VAGA,
                    label: `${vaga.NR_VAGA} - ${vaga.NM_CARGO} - ${vaga.NM_APELIDO_CLIENTE}`,
                };
            })
        );
    }, [vagas]);

    return (
        <>
            <label htmlFor={props.id} className="inline-flex">
                {props?.required && (
                    <FontAwesomeIcon
                        icon={faAsterisk}
                        width="10"
                        height="10"
                        color="red"
                        className="self-start mr-1"
                    />
                )}
                {props?.label && <FieldLabel>{props?.label || ""}</FieldLabel>}
            </label>
            <Select
                isClearable={isClearable}
                id={props.id}
                value={selectedOption}
                onChange={handleChange}
                options={options}
                isSearchable={true}
                onSearchInputChange={(e) => {
                    setfilter(e.target.value);
                }}
                placeholder={placeholder || "Selecione"}
                noOptionsMessage={"Nenhum registro encontrado"}
                searchInputPlaceholder={"Digite para filtrar"}
            />
        </>
    );
};

export default Select2Vaga;
