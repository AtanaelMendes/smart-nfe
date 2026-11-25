import { cn } from '@/assets/utils';
import React, { forwardRef } from 'react';

const btnType = (outline, bordered, buttonType) => {
    const outlined = outline || bordered;
    const variants = {
        primary: outlined
            ? 'border-blue-600/60 text-blue-700 hover:border-blue-700 hover:bg-blue-600/5 dark:border-blue-400/60 dark:text-blue-300 dark:hover:border-blue-300 dark:hover:bg-blue-400/10'
            : 'border-transparent bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400',
        secondary: outlined
            ? 'border-slate-400/70 text-slate-700 hover:border-slate-600 hover:bg-slate-900/5 dark:border-slate-500 dark:text-slate-200 dark:hover:border-slate-300 dark:hover:bg-white/5'
            : 'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
        success: outlined
            ? 'border-emerald-600/60 text-emerald-700 hover:border-emerald-700 hover:bg-emerald-600/5 dark:border-emerald-400/60 dark:text-emerald-300 dark:hover:bg-emerald-400/10'
            : 'border-transparent bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 hover:shadow-md dark:bg-emerald-600 dark:hover:bg-emerald-500',
        danger: outlined
            ? 'border-red-600/60 text-red-700 hover:border-red-700 hover:bg-red-600/5 dark:border-red-400/60 dark:text-red-300 dark:hover:bg-red-400/10'
            : 'border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md dark:bg-red-500 dark:hover:bg-red-400',
        warning: outlined
            ? 'border-amber-600/60 text-amber-800 hover:border-amber-700 hover:bg-amber-600/5 dark:border-amber-400/60 dark:text-amber-300 dark:hover:bg-amber-400/10'
            : 'border-transparent bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 hover:shadow-md',
        ghost: 'border-transparent bg-transparent text-slate-600 shadow-none hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10',
    };
    return variants[buttonType] || variants.ghost;
};

export const generateButtonClass = (buttonType, pill, square, size, block, outline, bordered, disabled) => cn(
    'relative inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap border text-sm font-medium leading-5 tracking-wide outline-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none',
    square ? 'rounded-none' : pill ? 'rounded-full' : 'rounded-md',
    size === 'small' ? 'min-h-8 px-3 py-1 text-xs' : size === 'large' ? 'min-h-12 px-6 py-3' : 'min-h-10 px-4 py-2',
    block ? 'w-full' : 'w-fit',
    btnType(outline, bordered, buttonType),
    disabled ? 'pointer-events-none cursor-not-allowed opacity-40 shadow-none' : 'cursor-pointer active:brightness-95',
);

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
const Button = forwardRef(({
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
	...rest
}, ref) => {
	const	handleClick = (evt) => {
		if (type === 'button' && evt) {
			evt.stopPropagation();
		}
		onClick && onClick(evt);
	}

	return (
		<button
			ref={ref}
			type={type}
			className={cn(
				generateButtonClass(buttonType, pill, square, size, block, outline, bordered, disabled),
				className
			)}
			onClick={handleClick}
			disabled={disabled}
			title={title}
			{...rest}
		>
			{children}
		</button>
	)
})

Button.displayName = 'Button'

export default Button
