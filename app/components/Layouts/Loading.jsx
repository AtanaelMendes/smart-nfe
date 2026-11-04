import { cn } from "@/assets/utils";

/**
 * Loading — spinner de carregamento do SmartNFe.
 * Substituiu a versão anterior que usava logo de outro sistema.
 *
 * Props:
 *   active    — se true, exibe o loading
 *   className — classes adicionais para o container
 */
const Loading = ({ active, className }) => {
  if (!active) return null;

  return (
    <div
      className={cn(
        "flex absolute w-full h-full bg-white bg-opacity-90 z-[999] top-0 left-0 items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Spinner animado */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        {/* Logo texto */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-blue-700 tracking-tight">SmartNFe</span>
          <span className="text-xs text-gray-400 mt-0.5">Carregando...</span>
        </div>
      </div>
    </div>
  );
};

export default Loading;
