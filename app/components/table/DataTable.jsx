import { useCallback, useEffect, useState } from "react";
import InputText from '@/components/inputs/InputText';

const DataTable = ({ data, header, dense, mainText, action }) => {
    const [tableBody, setTableBody] = useState([]);
    const [thead, setThead] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [filter, setFilter] = useState({
        filtra_table: ""
    });

    useEffect(() => {
        theadToHtml();
    }, [header]);

    useEffect(() => {
        setTableData(data);
    }, [data]);

    useEffect(() => {
        dataToHtml();
    }, [tableData]);

    useEffect(() => {   
        if (data) {
            setTableData(data.filter(item =>
                Object.values(item).some(v =>
                    typeof v === 'string' && v.toLowerCase().includes(filter.filtra_table.toLowerCase())
                )
            ));
        }
    }, [filter]);

    const theadToHtml = () => {
        setThead(header.map(title => {
            return (
                <th scope="col" className={`${dense ? " px-2 py-1 " : " px-4 py-2 "} text-${title?.align || "left"}`} key={title.label}>
                    <div className="inline-flex items-center" title={`${title?.title || ""}`}>
                        {title.label}
                        {/* <FontAwesomeIcon icon={faArrowsUpDown} width="12" height="12" className="ml-2"/> */}
                    </div>
                </th>
            );
        }));
    }

    const dataToHtml = () => {
        if (!tableData) {
            return setTableBody(<tr className="odd:bg-white even:bg-gray-50"><td colSpan={header.lenght || 1}>Não há dados para exibir...</td></tr>);
        }

        setTableBody(tableData.map((item, index) => {
            const getColumns = () => {
                var chaves = Object.keys(item);
                return chaves.map((chave, indexChave) => { return (<td className={`${dense ? " px-2 py-1 " : " px-4 py-2 "} text-${header[indexChave]?.align || "left"}`} key={chave}>{item[chave]}</td>); });
            }
            return (<tr className="odd:bg-white even:bg-gray-100 hover:bg-drop-shadow-1" key={`tr-${index}`}>{getColumns()}</tr>);
        }));
    }

    const setFilterTextCallback = useCallback((id, value) => {
        setFilter(prevFormFilterStatus => ({
            ...prevFormFilterStatus,
            [id]: value
        }));
    }, [setFilter]);

    return (
        <div className="flex w-full flex-wrap bg-white max-h-[80%]">
            <div className="mx-auto bg-slate-300 rounded-t-lg shadow-lg flex pl-4 items-center justify-between w-full">
                <div className="text-slate-800">{mainText}</div>
                <div className="flex items-center">
                    <div>{action}</div>
                    <div className="w-30 p-1 ml-4">
                        <InputText placeholder="Filtrar" onChange={setFilterTextCallback} id="filtra_table" clearable={true}/>
                    </div>
                </div>
            </div>
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg w-full max-h-full overflow-y-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 relative">
                    <thead className="text-xs text-gray-700 uppercase bg-slate-200 sticky top-0">
                        <tr>{thead}</tr>
                    </thead>
                    <tbody>
                        {tableBody}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-slate-300">
                        <tr>
                            <td colSpan={header.length || 1} className={`${dense ? " px-2 py-1 " : " px-4 py-2 "}`}>
                                Exibindo {tableData.length} registros
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

    );
}
export default DataTable;