import { useCallback, useContext, useEffect, useState } from 'react'
import { DebouncedSearchContext } from '.'
import axios from 'axios'
import Select from 'react-tailwindcss-select'
import { useDebounce } from '@/hooks/useDebounce'
import PillsBadge from '@/components/buttons/PillsBadge'
import axiosInstance from '@/plugins/axios'

const DebouncedSearchSelectDelayed = ({
	onChange,
	value,
	urlGet,
	setData,
	optId,
	optLabel,
	renderOptionLabel,
	otherParams,
	isMultiple = false,
}) => {
	const { id } = useContext(DebouncedSearchContext)
	const [filter, setFilter] = useState('')
	const [options, setOptions] = useState([])
	const [loading, setLoading] = useState(false)
	const [selectedOption, setSelectedOption] = useState(isMultiple ? [] : null)

	// Aplica debounce no filtro
	const debouncedFilter = useDebounce(filter, 500)

	const otherParamsAsString = useCallback(() => {
		if (!otherParams || Object.keys(otherParams).length === 0) return ''
		return Object.entries(otherParams)
			.map(([_, value]) => `/${value}`)
			.join('')
	}, [otherParams])

	const handleChange = useCallback(
		evt => {
			if (!evt) return

			if (isMultiple) {
				setSelectedOption(evt)
				const formatted = evt.map(e => ({ id: e.value, label: e.label.split(" | ")[0].trim() }))
				setData?.(formatted)
				onChange?.(formatted.map(f => f.id))
			} else {
				const nomeLimpo = evt.label.split(" | ")[0].trim()
				setSelectedOption({ value: evt.value, label: nomeLimpo })
				setData?.(evt.value, nomeLimpo)
				onChange?.(evt.value)
			}
			setFilter('')
		},
		[onChange, setData, isMultiple]
	)

	const getData = useCallback(
		async searchValue => {
			if (!searchValue) return

			setLoading(true)

			await axiosInstance
				.get(`${urlGet}/${searchValue}${otherParamsAsString()}`)
				.then(response => {
					const dataArray = Array.isArray(response.data) ? response.data : [response.data]

					const fetchedOptions = dataArray
						.filter(opt => opt && opt[optId] && opt[optLabel])
						.map(opt => ({
							value: opt[optId],
							label: `${opt[optId]} - ${opt[optLabel]}`,
						}))

					// if (fetchedOptions.length > 0) {
					setOptions(fetchedOptions)

					// 	if (
					// 		fetchedOptions.length === 1 &&
					// 		String(fetchedOptions[0].value) === String(searchValue)
					// 	) {
					// 		setSelectedOption(fetchedOptions[0])
					// 	}
					// }
					// return fetchedOptions
				})
				.catch(error => {
					if (!axios.isCancel(error)) {
						console.error('Erro ao buscar opções:', error)
					}
					return []
				})
				.finally(() => {
					setLoading(false)
				})
		},
		[urlGet, optId, optLabel, otherParamsAsString]
	)

	// Efeito para o filtro debounced
	useEffect(() => {
		if (debouncedFilter.length === 0) {
			setOptions([])
		} else if (debouncedFilter.length >= 3) {
			getData(debouncedFilter)
		}
	}, [debouncedFilter, getData])

	// Efeito para valor inicial
	useEffect(() => {
		if (!value) return

		const selected = options.find(option => option.value === value)
		if (selected) {
			setSelectedOption(selected)
		} else if (options.length === 0) {
			getData(value)
		}
	}, [value, options, getData])

	const handleSearchInput = useCallback(e => {
		e.preventDefault()
		setFilter(e.target.value)
	}, [])

	const optionLabel = useCallback(option => {
		if (renderOptionLabel) {
			return (
				renderOptionLabel(option)
			)
		}

		return (
			<div className='flex flex-row items-center gap-1 p-1 hover:bg-gray-100 rounded-sm cursor-pointer'>
				<PillsBadge type={'primary'}>{option.label}</PillsBadge>
			</div>
		)
	}, [])

	return (
		<Select
			id={id}
			isMultiple={isMultiple}
			value={selectedOption}
			onChange={handleChange}
			options={options}
			isSearchable
			onSearchInputChange={handleSearchInput}
			placeholder='Selecione'
			noOptionsMessage={loading ? 'Carregando...' : 'Nenhum registro encontrado'}
			loading={loading}
			searchInputPlaceholder='Digite para filtrar'
			formatOptionLabel={data => optionLabel(data)}
		/>
	)
}

const DebouncedSearchSelectNormal = ({ onChange, value, urlGet, optId, optLabel, isClearable, ready = true, elevateMenu = false, isMultiple = false, isDisabled = false }) => {
	const { id } = useContext(DebouncedSearchContext)
	const [options, setOptions] = useState([])
	const [selectedOption, setSelectedOption] = useState(isMultiple ? [] : null)
	const [loading, setLoading] = useState(false)

	const getOptions = async () => {
		setLoading(true)
		await axiosInstance
			.get(urlGet)
			.then(response => {
				const fetchedOptions = response.data
					.filter(opt => opt && opt[optId] && opt[optLabel])
					.map(opt => ({
						value: opt[optId],
						label: opt[optLabel].trim(),
					}))
				setOptions(fetchedOptions)
			})
			.catch(err => {
				console.error('Erro ao buscar opções:', err)
			})
			.finally(() => {
				setLoading(false)
			})
	}

	useEffect(() => {
		if (urlGet && ready) {
			getOptions()
		}
	}, [urlGet, ready])

	useEffect(() => {
		if (!value || (isMultiple && value.length === 0)) {
			setSelectedOption(isMultiple ? [] : null)
			return
		}

		if (isMultiple) {
			const selected = options.filter(opt => value.includes(opt.value))
			setSelectedOption(selected)
		} else {
			const selected = options.find(option => option.value === value)
			if (selected) setSelectedOption(selected)
		}
	}, [value, options, isMultiple])

	const handleChange = evt => {
		if (isMultiple) {
			setSelectedOption(evt || [])
			onChange?.((evt || []).map(item => item.value))
		} else {
			setSelectedOption(evt?.value ? { value: evt?.value, label: evt?.label } : null)
			onChange?.(evt?.value)
		}
	}

	return (
		<Select
			id={id}
			isMultiple={isMultiple}
			options={options}
			isClearable={isClearable}
			isSearchable={true}
			value={selectedOption}
			isDisabled={isDisabled}
			onChange={handleChange}
			placeholder='Selecione'
			noOptionsMessage={loading ? 'Carregando...' : 'Nenhum registro encontrado'}
			loading={loading}
			classNames={{
				menuButton: ({ isDisabled }) =>
					`flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none min-h-[36px] max-h-[90px] overflow-y-auto ${isDisabled
						? 'bg-gray-200 cursor-not-allowed'
						: 'bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20'
					}`,
					menu: "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
					list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
			}}
		/>
	)
}

/**
 * Componente que renderiza o Select com campo de busca do DebouncedSearch.
 * Dependendo do valor de delayed, é renderizado o Select com debounce
 * ou o Select normal.
 *
 * @author https://github.com/caiodutra08
 *
 * @returns {ReactNode} O Select do DebouncedSearch
 */
export const DebouncedSearchSelect = ({
	delayed,
	className,
	helperText,
	formValidate,
	isMultiple = false,
	isDisabled = false,
	...props
}) => {
	const { id } = useContext(DebouncedSearchContext)

	function hasError() {
		return formValidate && formValidate.hasOwnProperty(id) && formValidate[id].error
	}

	function renderError() {
		if (!hasError()) return
		let errorMsg = formValidate[id].errorMsg || 'Este campo é obrigatório'

		return <div className='text-xs text-red-600'>{errorMsg}</div>
	}

	return (
		<>
			{delayed ? (
				<DebouncedSearchSelectDelayed isMultiple={isMultiple} {...props} />
			) : (
				<DebouncedSearchSelectNormal isMultiple={isMultiple} isDisabled={isDisabled} {...props} />
			)}
			{renderError()}
			{helperText && <div className='text-xs text-blue-600'> {helperText} </div>}
		</>
	)
}
