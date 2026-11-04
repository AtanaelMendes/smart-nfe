import { cn } from '@/assets/utils'
import { FieldLabel } from '../Layouts/Typography'

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
						'text-sm font-medium text-gray-900 -bottom-6 start-0',
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
			{label && (
				<div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
					<FieldLabel className={cn(required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
						{label}
					</FieldLabel>
				</div>
			)}
			<div className='relative w-full border rounded-lg p-2'>
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
						'w-full h-2 bg-gray-200 rounded-lg',
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
