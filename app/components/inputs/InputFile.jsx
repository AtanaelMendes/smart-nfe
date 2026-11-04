import { faCloudUploadAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAppContext } from "@/context/AppContext";
import { useState, useRef } from "react";

const InputFile = (props) => {
    const { toast } = useAppContext();
    const [dragging, setDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState(null);
    const fileInputRef = useRef(null);

    const allowedExtensions = [".doc", ".docx", ".pdf", ".jpg", ".jpeg", ".png"];

    const handleDragOver = (event) => {
        event.preventDefault();
        setDragging(true);
    };

    const handleDragEnter = (event) => {
        event.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setDragging(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragging(false);

        if (props.disabled) {
            return;
        }

        const droppedFile = event.dataTransfer.files[0];

        if (validaArquivo(event, droppedFile)) {
            setSelectedFile(droppedFile);
        }
    };

    const handleFileInputChange = (event) => {
        if (props.disabled) {
            return;
        }

        const file = event.target.files[0];

        if (validaArquivo(event, file)) {
            setSelectedFile(file);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current.click();
    };

    const validaArquivo = (event, file) => {
        if (!file || props.disabled) {
            setSelectedFile(null);
            setSelectedFileName("");
            return false;
        }

        // Verifica se o tamanho do arquivo excede 5MB
        const maxFileSizeInMB = 5 * 1024 * 1024;
        if (file.size > maxFileSizeInMB) {
            toast.error(
                `O tamanho do arquivo não pode exceder 5MB. Por favor, selecione um arquivo menor.`
            );
            setSelectedFileName("");
            setSelectedFile(null);
            return false;
        }

        // Verifica se a extensão do arquivo está na lista de permitidas
        let extension = file.name.split(".").pop().toLowerCase();
        extension = `.${extension}`;
        if (!allowedExtensions.includes(extension)) {
            toast.error(`Arquivo inválido! Arquivos aceitos: ${allowedExtensions.join(", ")}`);
            setSelectedFileName("");
            setSelectedFile(null);
            return false;
        }

        let tempFileName = file.name;
        if (tempFileName.length > 30) {
            tempFileName = "(...) " + tempFileName.slice(-30);
        }

        setSelectedFileName(tempFileName);

        //Seta o valor no elemento pai
        if (typeof props.onChange == "function") {
            props.onChange(event.target.id, file);
        }

        return true;
    };

    function hasError() {
        return props.required?.hasOwnProperty(props.id) && props.required[id].error;
    }

    function renderError() {
        if (!hasError()) return;
        let errorMsg = props.required[props.id]?.errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    return (
        <>
            <div
                className={`border-2 rounded border-dashed px-2 py-1 align-center 
                    ${
                        props?.disabled
                            ? "bg-gray-100 cursor-not-allowed text-gray-600"
                            : `cursor-pointer text-blue-600 ${
                                  dragging
                                      ? "border-blue-600 bg-blue-100"
                                      : "bg-gray-50 border-slate-300"
                              }`
                    }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFileDialog} // Permite clicar para abrir a janela de seleção de arquivo
            >
                <div className="grid grid-cols-12 gap-2">
                    {/* Informações exibidas na edição de candidato */}
                    <div className="col-span-2 flex items-center justify-end">
                        <FontAwesomeIcon icon={faCloudUploadAlt} width="30" height="30" />
                    </div>
                    <div className="col-span-10">
                        <span className="text-sm text-gray-600 block text-center">
                            <span className="font-bold">{props.label || "Arquivo"}</span>
                            <span className={"text-xs italic font-semibold"}>
                                &nbsp;{props.subLabel || ""}
                            </span>
                        </span>
                        <span className="text-sm text-gray-500 block text-center">
                            <span className="font-semibold">Clique para selecionar </span> ou
                            arraste e solte
                        </span>
                        <div className={"text-center text-sm"}>
                            {selectedFileName || "Nenhum arquivo escolhido"}
                        </div>
                    </div>
                </div>
                <input
                    type="file"
                    id={props.id || "fileInput"}
                    ref={fileInputRef}
                    className="hidden"
                    disabled={props?.disabled}
                    onChange={handleFileInputChange}
                    accept={`${allowedExtensions.join(", ")}`}
                />
            </div>
            {props?.helperText && <div className="text-xs text-blue-600"> {props.helperText} </div>}
            {renderError()}
        </>
    );
};

export default InputFile;
