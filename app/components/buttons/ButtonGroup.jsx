import { cn } from "@/assets/utils";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const ButtonGroup = ({ buttons, small, className, vertical }) => {
	const handleClick = (callback) => {
		if (typeof callback === "function") {
			callback();
		}
	};

	const renderButtons = () => {
		return buttons?.map((btn, index) => {
			return (
				<div
					key={`${btn.id}_${index + 1}`}
					id={`${btn.id}_${index + 1}`}
					className={`${className} ${btn?.className}`}
				>
					<TooltipComponent
						content={
							<span className="font-semibold">{`${
								btn.tooltip || ""
							}`}</span>
						}
						asChild
					>
						<button
							type="button"
							onClick={() => handleClick(btn?.onclick)}
							disabled={btn.disabled}
							className={cn(
								"text-sm font-medium bg-white border border-gray-300 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-transparent focus:text-blue-700",
								small ? " px-2 py-1 " : "px-4 py-2",
								btn.className,
								btn.disabled && "cursor-not-allowed opacity-50"
							)}
						>
							{btn.label}
						</button>
					</TooltipComponent>
				</div>
			);
		});
	};

	return (
		<div className={`flex ${vertical ? "flex-col" : "flex-row"}`}>
			{renderButtons()}
		</div>
	);
};

export default ButtonGroup;
