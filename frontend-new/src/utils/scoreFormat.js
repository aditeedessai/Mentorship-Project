/**
 * Formats a score/mark value to always display two decimal places.
 *
 * Examples:
 *   9          -> "9.00"
 *   8.4        -> "8.40"
 *   8.99999999 -> "9.00"
 *   7.6666666  -> "7.67"
 *   0          -> "0.00"
 *   10         -> "10.00"
 */
export const formatScore = (value) => {
  if (value === null || value === undefined) return "0.00";
  const num = Number(value);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
};

export default formatScore;
