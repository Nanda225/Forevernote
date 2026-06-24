/**
 * Utility to compress images in-browser to a highly compact base64 JPG format.
 * This ensures that photo attachments easily fit into Firestore documents (under 1MB limit).
 */
export function compressAndConvertToBase64(file: File, maxW = 800, maxH = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          // Draw on canvas for compression
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            // Fallback to raw base64 if canvas context fails
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as highly compressed JPEG
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        } catch (err) {
          console.error("[compressAndConvertToBase64] Failed compression, falling back to original", err);
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}
