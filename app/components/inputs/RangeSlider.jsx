import { cn } from '@/assets/utils'

const RangeSlider = ({
	value,
	label,
	disabled,
	onChange,
	onClick,
	id,
	enableMinMax,
	min = 10,
	max = 40,
	step = 10,
	renderMinMax,
	className,
	required
}) => {
	const handleChange = evt => {
		onChange(id, evt.target.value)
	}

	const handleClick = val => {
		onClick(id, val)
	}

	const defaultRenderMinMax = () => {
		return Array.from({ length: (max - min) / step + 1 }).map((_, index) => {
			return (
				<span
					key={index}
					className={cn(
						'text-sm font-medium text-slate-700 dark:text-slate-300 -bottom-6 start-0',
						disabled ? 'cursor-not-allowed' : 'cursor-pointer'
					)}
					onClick={() => {
						onClick && !disabled && handleClick(10 + index * step)
					}}
				>
					{10 + index * step}%
				</span>
			)
		})
	}

	return (
		<div className={cn('w-full relative', className)}>
            {label && <label htmlFor={id} className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required && ' *'}</label>}
			<div className='relative w-full px-1 py-2'>
				<input
					id={id}
					min={min}
					max={max}
					step={step}
					type='range'
					value={value}
					disabled={disabled}
					onChange={onChange && handleChange}
					className={cn(
						'w-full h-1.5 rounded-full bg-slate-200 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 dark:bg-slate-700 dark:accent-blue-400',
						disabled ? 'cursor-not-allowed' : 'cursor-pointer'
					)}
				/>
				<div className='flex flex-row justify-between'>
					{enableMinMax && (renderMinMax ? renderMinMax : defaultRenderMinMax())}
				</div>
			</div>
		</div>
	)
}

export default RangeSlider
