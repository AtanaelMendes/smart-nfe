import { faAsterisk, faInfoCircle, faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { FieldLabel } from '../Layouts/Typography'
import { TooltipComponent } from '../Layouts/TooltipComponent'
import { cn } from '@/assets/utils'
import Button from '../buttons/Button'

const InputDate = ({small, variant, ...props}) => {
	const variantClasses = {
		danger: 'border-red-500 text-red-500',
		warning: 'border-yellow-500 text-yellow-500',
		info: 'border-blue-500 text-blue-500',
		success: 'border-green-500 text-green-500',
		default: 'border-gray-300 text-gray-500',
	}
	const handleChange = evt => {
		if (typeof props.onChange === 'function') {
			props.onChange(evt.target.id, evt.target.value)
		}
	}

	const handleBlur = evt => {
		if (typeof props.onBlur === 'function') {
			props.onBlur(evt.target.id, evt.target.value)
		}
	}

	const hasError = () =>
		props?.required?.hasOwnProperty(props.id) && props?.required[props.id].error

	function renderError() {
		if (!hasError()) return
		let errorMsg = props?.required[props.id].errorMsg || 'Este campo é obrigatório'

		return <div className='text-xs text-red-600'>{errorMsg}</div>
	}

	function getValue() {
		if (!props.value) return ''
		let formatDDMMYYYY = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/

		// Verifica se a data corresponde ao formato dd/mm/yyyy
		if (formatDDMMYYYY.test(props.value)) {
			let partes = props.value.split('/')
			let dia = partes[0]
			let mes = partes[1]
			let ano = partes[2]
			return `${ano}-${mes}-${dia}`
		}
		return props.value
	}

	function copyFormatedDate() {
		let date =  getValue();
		if (!date) return
		const [year, month, day] = date.split("-");
  		navigator.clipboard.writeText(`${day}/${month}/${year}`);
	}

	return (
		<div className={cn(
			'relative w-full focus:ring-blue-500 focus:border-blue-500 border rounded-md focus:text-blue-500 mt-1',
			hasError() ? `border-red-500 text-red-500` : 'border-gray-300 text-gray-500',
			variantClasses[variant || "default"],
			)}>
			{props.label && (
				<div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
					<label htmlFor={props.id} >
						<FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0', variantClasses[variant || "default"], 'mb-0 pb-0')}>
							{props.label || ''}
						</FieldLabel>
					</label>
					{props?.required && (
						<FontAwesomeIcon
							icon={faAsterisk}
							width='10'
							height='10'
							color='red'
							className='self-start absolute'
						/>
					)}
					{props?.hint && (
						<>
							<TooltipComponent
								content={<div className='text-xs z-20 max-w-[300px]'>{props?.hint}</div>}
								asChild
							>
								<FontAwesomeIcon
									icon={faInfoCircle}
									width='16'
									height='16'
									color='blue'
									className='self-start ml-2'
									tabIndex={-1}
								/>
							</TooltipComponent>
						</>
					)}
				</div>
			)}
			<div className='flex relative'>
				<input
					id={props.id}
					name={props.name || props.id}
					required={props.required}
					value={getValue()}
					min={props.minDate || '1970-01-01'}
					max={props.maxDate || '2200-12-31'}
					disabled={props.disabled || false}
					placeholder={props.placeholder || ''}
					onChange={handleChange}
					onBlur={handleBlur}
					type='date'
					className={cn(
						small ? " py-1 pr-1.5 text-xs " : "p-2 text-base",
						'rounded-lg block w-full text-gray-900 border-none',
						props.disabled && 'bg-gray-200 cursor-not-allowed',
						props.className
					)}
				/>
				{renderError()}
				{props.helperText && <div className='text-xs text-blue-600'> {props.helperText} </div>}

				{props?.copy && (
					<TooltipComponent content={"Copiar data"} asChild>
						<div>
							<Button
								onClick={copyFormatedDate}
								className={`text-blue-700 border h-full rounded-md shadow px-2 py-1 ml-2 hover:bg-blue-700 hover:text-white`}
							>
								<FontAwesomeIcon
									icon={faCopy}
									width="15"
									height="15"
								/>
							</Button>
						</div>
					</TooltipComponent>
				)}
			</div>
		</div>
	)
}
export default InputDate
