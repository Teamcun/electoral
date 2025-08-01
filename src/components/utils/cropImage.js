// utils/cropImage.js
export default function getCroppedImg(imageSrc, pixelCrop) {
  const canvas = document.createElement('canvas');
  const image = new Image();
  image.src = imageSrc;

  return new Promise((resolve) => {
    image.onload = () => {
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        const croppedImageUrl = URL.createObjectURL(blob);
        resolve(croppedImageUrl);
      }, 'image/jpeg');
    };
  });
}

export const mejorarEstiloDocumento = async (base64Image) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      // Dibuja la imagen original
      ctx.drawImage(img, 0, 0);

      // Obtiene los datos de píxeles
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Mejora: escala de grises y mejora de contraste
      for (let i = 0; i < data.length; i += 4) {
        // Promedio para gris
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

        // Mejora el contraste (simple ajuste lineal)
        const contrasted = avg > 128 ? 255 : 0;

        data[i] = contrasted;     // R
        data[i + 1] = contrasted; // G
        data[i + 2] = contrasted; // B
        // data[i + 3] = alpha (no cambiamos)
      }

      ctx.putImageData(imageData, 0, 0);
      const result = canvas.toDataURL('image/jpeg', 1);
      resolve(result);
    };
  });
};
