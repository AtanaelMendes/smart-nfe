export default function NewBadge({ referenceDate, rotate = 0, days = 30, size = "0.5rem", className = "" }) {
    if (!referenceDate) return null; //Se a data de referencia não for informada, não renderiza

    const [day, month, year] = referenceDate.split('/').map(Number);
    const refDate = new Date(year, month - 1, day);
    const validade = new Date(refDate);
    validade.setDate(validade.getDate() + days);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Se já passou da validade, não renderiza
    if (hoje > validade) return null;

    return (
        <span
            style={{ transform: `rotate(${rotate}deg)` }}
            className={`${className || ""} bg-red-600 text-white text-[${size}] font-bold px-1 py-0.5 rounded-md uppercase shadow-md z-10`}
        >
            Novo
        </span>
    );
}
