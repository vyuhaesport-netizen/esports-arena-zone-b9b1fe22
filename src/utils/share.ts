// Utility helpers for sharing tournament links reliably across devices/browsers.

export type TournamentShareData = {
  title: string;
  text: string;
  url: string;
};

export function buildTournamentShareUrl(tournamentId: string) {
  return `${window.location.origin}/tournament/${tournamentId}`;
}

export function buildTournamentShareText(params: { title: string; prize?: string | null }) {
  const prizePart = params.prize ? ` Prize: ${params.prize}.` : "";
  return `Join ${params.title} on Vyuha Esport!${prizePart}`;
}

export async function tryNativeShare(shareData: ShareData): Promise<boolean> {
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share !== 'function') return false;

  try {
    if (typeof nav.canShare === 'function' && !nav.canShare(shareData)) {
      return false;
    }

    await nav.share(shareData);
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // continue to fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function openWhatsAppShare(message: string): boolean {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
  return !!win;
}
