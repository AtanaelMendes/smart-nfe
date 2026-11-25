import { cn } from "@/assets/utils";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import Button from "./Button";

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
						<Button
							buttonType="secondary"
							bordered
							size={small ? "small" : "medium"}
							onClick={() => handleClick(btn?.onclick)}
							disabled={btn.disabled}
							className={cn(
								"border-gray-300 dark:border-slate-500 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:text-blue-700",
								btn.className,
								btn.disabled && "cursor-not-allowed opacity-50"
							)}
						>
							{btn.label}
						</Button>
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
