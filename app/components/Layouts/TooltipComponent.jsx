export const TooltipComponent = ({
  children,
  content,
  asChild = false,
  side = "top",
  ...rest
}) => {
  const sideClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={`absolute ${sideClasses[side]} left-1/2 -translate-x-1/2 hidden group-hover:block z-50 bg-gray-800 text-white text-xs rounded px-3 py-1.5 whitespace-nowrap shadow-lg`}
        {...rest}
      >
        {content}
        <div className={`absolute w-2 h-2 bg-gray-800 ${
          side === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1' :
          side === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1' :
          side === 'left' ? 'left-full top-1/2 -translate-y-1/2 translate-x-1' :
          'right-full top-1/2 -translate-y-1/2 -translate-x-1'
        }`} />
      </div>
    </div>
  );
};
