// Date utilities to replace date-fns
export const formatDate = (date, formatStr = "dd/MM/yyyy") => {
  if (!date) return "";
  const d = new Date(date);
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  
  switch (formatStr) {
    case "dd/MM/yyyy":
      return `${day}/${month}/${year}`;
    case "yyyy-MM-dd":
      return `${year}-${month}-${day}`;
    case "dd/MM/yyyy HH:mm":
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    default:
      return d.toLocaleDateString("pt-BR");
  }
};

export const isValidDate = (date) => {
  if (date instanceof Date) return !isNaN(date);
  if (typeof date === "string") {
    const d = new Date(date);
    return !isNaN(d);
  }
  return false;
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const format = formatDate;
export const isDate = isValidDate;
