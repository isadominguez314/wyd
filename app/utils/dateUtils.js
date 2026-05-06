export const parseLocalDate = (dateInput) => {
  if (!dateInput) return new Date(NaN);

  if (dateInput instanceof Date) {
    return new Date(dateInput.getTime());
  }

  if (typeof dateInput === "string") {
    const dateOnlyMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(dateInput);
};

export const toLocalDateKey = (dateInput) => {
  const date = parseLocalDate(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatLocalDate = (dateInput, options = {}) =>
  parseLocalDate(dateInput).toLocaleDateString(undefined, options);
