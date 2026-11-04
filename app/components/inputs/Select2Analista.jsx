import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAsterisk } from '@fortawesome/free-solid-svg-icons'
import { FieldLabel } from '@/components/Layouts/Typography'
import { useEffect, useState } from 'react'
import Select from 'react-tailwindcss-select'
import { useAppContext } from '@/context/AppContext'
import axios from 'axios'
import axiosInstance from '@/plugins/axios'
import { cn, empty } from '@/assets/utils'

const Select2Analista = ({ cdPessoaAnalista, required, onChange, onReady, id, value, label, helperText, isDisabled, ...props }) => {
	const [filter, setfilter] = useState('');
	const [analistas, setAnalistas] = useState([]);
	const { toast, user } = useAppContext();
	const [selectedOption, setSelectedOption] = useState(null);
	const [cancelTokenSource, setCancelTokenSource] = useState(null);
	const [ready, setReady] = useState(false);

	const handleChange = value => {
		const isValueValid = !empty(value);

		if (!isValueValid) {
			setSelectedOption(null);
			if (typeof onChange === 'function') {
				onChange('', '')
			}
			return
		}

		setSelectedOption(value)

		const nmAnalista = value.label.split(' - ')[1]
		if (typeof onChange === 'function') {
			onChange(value.value, nmAnalista)
		}
	}

	function hasError() {
		return required && required.hasOwnProperty(id) && required[id].error
	}

	function renderError() {
		if (!hasError()) return
		const errorMsg = required[id].errorMsg || 'Este campo é obrigatório'

		return <div className='text-xs text-red-600'>{errorMsg}</div>
	}

	useEffect(() => {
		if (!ready) return;

		if (typeof onReady === 'function') {
			onReady();
		}
	}, [ready]);

	useEffect(() => {
		if (filter.length < 3) return

		getAnalistas()

		return () => {
			if (cancelTokenSource) {
				cancelTokenSource.cancel('Componente desmontado.')
			}
			setAnalistas([])
		}
	}, [filter])

	useEffect(() => {
		if (empty(cdPessoaAnalista)) return
		// Se cdPessoaAnalista for fornecido, usar como filtro inicial para buscar o analista
		setfilter(cdPessoaAnalista)
	}, [cdPessoaAnalista])

	useEffect(() => {
		if (empty(cdPessoaAnalista) || analistas.length === 0) return
		
		// Encontrar o analista correspondente no array de analistas
		const analistaEncontrado = analistas.find(analista => analista.CD_PESSOA === cdPessoaAnalista)
		
		if (analistaEncontrado) {
			const optionValue = {
				value: analistaEncontrado.CD_PESSOA,
				label: `${analistaEncontrado.CD_PESSOA} - ${analistaEncontrado.NM_PESSOA}`,
			}
			setSelectedOption(optionValue)
		}
	}, [analistas, cdPessoaAnalista])

	const getAnalistas = async () => {
		if (cancelTokenSource) {
			cancelTokenSource.cancel('Operação cancelada devido a uma nova solicitação.');
		}

		const source = axios.CancelToken.source();
		setCancelTokenSource(source);
		setReady(false);
		try {
			const response = await axiosInstance.get(`analista/analistas/${user.cd_sip}/${filter}`, {
				cancelToken: source.token,
			});
			setAnalistas(response.data);
			setReady(true);
		} catch (error) {
			setReady(true);
			if (!axios.isCancel(error)) {
				toast.error('Não foi possível carregar os analistas.');
				console.error(error);
			}
		}
	}

	useEffect(() => {
		// Se value for fornecido e for diferente de selectedOption atual
		if (value && value !== selectedOption?.value) {
			// Se value for um objeto, usar diretamente
			if (typeof value === 'object' && value.value && value.label) {
				setSelectedOption(value)
			}
			// Se value for uma string, procurar nos analistas carregados
			else if (typeof value === 'string') {
				const analistaEncontrado = analistas.find(analista => analista.CD_PESSOA === value)
				if (analistaEncontrado) {
					const optionValue = {
						value: analistaEncontrado.CD_PESSOA,
						label: `${analistaEncontrado.CD_PESSOA} - ${analistaEncontrado.NM_PESSOA}`,
					}
					setSelectedOption(optionValue)
				} else {
					// Se não encontrou o analista, usar o valor como filtro para buscar
					setfilter(value)
				}
			}
		} else if (!value) {
			setSelectedOption(null)
		}
	}, [value, analistas])

	return (
		<div className='w-full relative'>
			<div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
				<label htmlFor={id} className='inline-flex relative'>
					{required && (
						<FontAwesomeIcon
							icon={faAsterisk}
							width='8'
							height='8'
							color='red'
							className='self-start absolute'
						/>
					)}
					{label && <FieldLabel className={cn(required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
						{label || ''}
					</FieldLabel>}
				</label>
			</div>

			<div className={`rounded-lg border ${hasError() ? 'border-red-500' : 'border-white'}`}>
				<Select
					isDisabled={isDisabled}
					id={id}
					loading={analistas.length === 0 && filter.length >= 3}
					value={selectedOption}
					isClearable={true}
					onChange={handleChange}
					options={
						analistas?.map(analista => ({
							value: analista.CD_PESSOA,
							label: `${analista.CD_PESSOA} - ${analista.NM_PESSOA}`,
						}))
					}
					isSearchable={true}
					onSearchInputChange={e => setfilter(e.target.value)}
					placeholder={'Selecione'}
					noOptionsMessage={'Nenhum registro encontrado'}
					searchInputPlaceholder={'Digite para filtrar'}
					classNames={{
						menuButton: ({ isDisabled }) =>
							`flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${
								isDisabled
									? 'bg-gray-200'
									: 'bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20'
							} [&>*:first-child]:w-[88%] [&>*:nth-child(2)]:w-[12%] [&>*:nth-child(2)>*]:p-0`,
						menu: "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
						list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
					}}
				/>
			</div>
			{renderError()}
			{helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {helperText} </div>}
		</div>
	)
}

export default Select2Analista
