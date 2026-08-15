/**
 * Genera una contraseña temporal fácil de dictar y de escribir.
 * Evita caracteres que se confunden: O/0, l/1/I, etc.
 */
const CONSONANTES = "bcdfghjkmnpqrstvwxz";
const VOCALES = "aeiou";
const DIGITOS = "23456789";

function al<T extends string>(cadena: T): string {
  return cadena[Math.floor(Math.random() * cadena.length)];
}

/** Ejemplo de resultado: "Kavu-7362" */
export function generarPassword(): string {
  const silaba = () => al(CONSONANTES) + al(VOCALES);
  const parte = (silaba() + silaba());
  const bloque = parte.charAt(0).toUpperCase() + parte.slice(1);
  const numeros = Array.from({ length: 4 }, () => al(DIGITOS)).join("");
  return `${bloque}-${numeros}`;
}
