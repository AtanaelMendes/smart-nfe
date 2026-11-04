import { cn } from '@/assets/utils';
import React from 'react';

const btnType = (outline, bordered, buttonType) => {
	const variants = {
		primary: cn(
			outline ? 'text-primary hover:bg-blue-200' : 'bg-primary text-white hover:bg-blue-700',
			bordered && 'border border-primary', 'focus:ring-blue-300'
		),
		secondary: cn(
			outline ? 'text-gray-900 hover:bg-gray-600 hover:text-white' : 'bg-white text-gray-900 bg-gray-300',
			bordered && 'border border-gray-500', 'focus:ring-gray-300'
		),
		success: cn(
			outline ? 'text-green-500 hover:bg-green-200' : 'bg-green-500 hover:bg-green-400 text-white transition-colors',
			bordered && 'border border-green-600', 'focus:ring-green-300'
		),
		danger: cn(
			outline ? 'text-red-600 hover:bg-red-500 hover:text-white transition-colors' : 'bg-red-600 text-white',
			bordered && 'border border-red-600', 'focus:ring-red-300'
		),
		warning: cn(
			outline ? 'text-yellow-500 hover:bg-yellow-200' : 'bg-yellow-500 text-white',
			bordered && 'border border-yellow-500', 'focus:ring-yellow-300'
		),
		ghost: cn(
			outline ? 'text-gray-900 hover:bg-gray-200' : 'bg-white text-gray-900',
			bordered && 'border border-gray-300', 'focus:ring-gray-300'
		),
	};

	return variants[buttonType] || variants.secondary;
}

export const generateButtonClass = (
	buttonType,
	pill,
	square,
	size,
	block,
	outline,
	bordered,
	disabled
) => {
	const baseClasses = 'focus:outline-none font-medium text-sm focus:ring-4 hover:transition-colors';
	const shapeClasses = square ? '' : pill ? 'rounded-full' : 'rounded';
	const sizeClasses = size === 'small' ? 'py-1 px-2' : 'py-2 px-4';
	const blockClasses = block ? 'w-full' : 'w-fit';
	const styleType = buttonType ? btnType(outline, bordered, buttonType) : '';
	const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
	return cn(baseClasses, shapeClasses, sizeClasses, blockClasses, styleType, disabledClasses);
}

/**
 * Componente Button renderiza um elemento de botão personalizável.
 *
 * @param {Object} props - O objeto de propriedades.
 * @param {string} props.buttonType - O tipo do botão (por exemplo, primary, secondary).
 * @param {string} [props.size="medium"] - O tamanho do botão (por exemplo, small, medium, large).
 * @param {string} [props.type="button"] - O atributo HTML type para o botão.
 * @param {boolean} [props.pill=false] - Se verdadeiro, o botão terá cantos arredondados.
 * @param {boolean} [props.square] - Se verdadeiro, o botão será quadrado.
 * @param {function} [props.onClick=null] - A função de manipulador de evento de clique.
 * @param {React.ReactNode} props.children - O conteúdo a ser exibido dentro do botão.
 * @param {boolean} [props.block=false] - Se verdadeiro, o botão será exibido como um elemento de bloco.
 * @param {boolean} [props.outline=false] - Se verdadeiro, o botão terá um estilo de contorno.
 * @param {boolean} [props.bordered=false] - Se verdadeiro, o botão terá uma borda.
 * @param {string} [props.className=""] - Classes CSS adicionais para aplicar ao botão.
 * @param {boolean} [props.disabled=false] - Se verdadeiro, o botão será desativado.
 * @param {string} [props.title=""] - O atributo title para o botão.
 *
 * @version 1.2.0
 * @returns {JSX.Element} O elemento de botão renderizado.
 */
const Button = ({
	buttonType,
	size = 'medium',
	type = 'button',
	pill = false,
	square,
	onClick = null,
	children,
	block = false,
	outline = false,
	bordered = false,
	className = '',
	disabled = false,
	title = '',
}) => {
	const	handleClick = (evt) => {
		if (type === 'button' && evt) {
			evt.stopPropagation();
		}
		onClick && onClick();
	}

	return (
		<button
			type={type}
			className={cn(
				generateButtonClass(buttonType, pill, square, size, block, outline, bordered, disabled),
				className
			)}
			onClick={handleClick.bind(null, this)}
			disabled={disabled}
			title={title}
		>
			{children}
		</button>
	)
}

export default Button
