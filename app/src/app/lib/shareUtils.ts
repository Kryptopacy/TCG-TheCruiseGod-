import html2canvas from 'html2canvas';

export async function captureShareCard(elementId: string): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2, // High res
    });
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch (error) {
    console.error('Failed to capture share card:', error);
    return null;
  }
}

export async function shareImage(blob: Blob, title: string, text: string) {
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'share.png', { type: 'image/png' })] })) {
    try {
      const file = new File([blob], 'tcg-moment.png', { type: 'image/png' });
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e;
    }
  }
  
  // Fallback: Copy text to clipboard
  await navigator.clipboard.writeText(text);
  return false;
}
