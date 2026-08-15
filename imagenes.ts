/**
 * Compresión de fotografías antes de subirlas.
 *
 * Una foto del celular pesa entre 3 y 8 MB. Subirla tal cual por datos móviles
 * tarda muchísimo, parece que la app se colgó, y a veces se corta a medias.
 * Además llena el almacenamiento del servidor en pocas semanas.
 *
 * Aquí la redimensionamos a 1600 píxeles como máximo y la guardamos en JPEG.
 * El resultado ronda los 300 KB: se ve igual de bien en pantalla, sube diez
 * veces más rápido y ocupa veinte veces menos.
 */

const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

/** Solo comprimimos formatos que el navegador sabe dibujar. */
function sePuedeComprimir(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp)$/i.test(file.type);
}

function leerComoImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("no se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/**
 * Devuelve una versión ligera de la foto. Si algo falla, o si el archivo no es
 * una imagen que podamos procesar, devuelve el original sin tocar: nunca
 * impedimos que se envíe algo por culpa de la compresión.
 */
export async function comprimirImagen(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!sePuedeComprimir(file)) return file;
  // Por debajo de 400 KB no vale la pena: el ahorro es mínimo.
  if (file.size < 400 * 1024) return file;

  try {
    const img = await leerComoImagen(file);
    const mayor = Math.max(img.width, img.height);
    const escala = mayor > LADO_MAXIMO ? LADO_MAXIMO / mayor : 1;
    const ancho = Math.round(img.width * escala);
    const alto = Math.round(img.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((r) =>
      lienzo.toBlob((b) => r(b), "image/jpeg", CALIDAD)
    );
    if (!blob || blob.size >= file.size) return file; // no mejoró: nos quedamos con el original

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Texto corto para explicarle a la persona cuánto se redujo. */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
