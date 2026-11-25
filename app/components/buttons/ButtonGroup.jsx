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
								"border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-400/10 hover:text-blue-700 dark:hover:text-blue-300 focus:z-10",
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
		<div className={`flex ${vertical ? "flex-col gap-1" : "flex-row gap-1"}`}>
			{renderButtons()}
		</div>
	);
};

export default ButtonGroup;
