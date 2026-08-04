export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function passwordChecks(value: string) {
  return { longEnough: value.length >= 8, hasLetter: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value), hasNumber: /\d/.test(value) };
}

export function isAcceptablePassword(value: string) {
  const checks = passwordChecks(value);
  return checks.longEnough && checks.hasLetter && checks.hasNumber;
}
