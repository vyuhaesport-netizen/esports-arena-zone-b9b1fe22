import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TournamentQRCode from "@/components/TournamentQRCode";
import { useToast } from "@/hooks/use-toast";
import {
  buildTournamentShareText,
  buildTournamentShareUrl,
  copyToClipboard,
  openWhatsAppShare,
  tryNativeShare,
} from "@/utils/share";

export type TournamentShareTournament = {
  id: string;
  title: string;
  prize_pool?: string | null;
  current_prize_pool?: number | null;
};

type TournamentShareDialogProps = {
  open: boolean;
  tournament: TournamentShareTournament | null;
  onOpenChange: (open: boolean) => void;
};

export default function TournamentShareDialog({
  open,
  tournament,
  onOpenChange,
}: TournamentShareDialogProps) {
  const { toast } = useToast();

  const getSharePayload = () => {
    if (!tournament) return null;

    const url = buildTournamentShareUrl(tournament.id);
    const text = buildTournamentShareText({
      title: tournament.title,
      prize: tournament.prize_pool || `₹${tournament.current_prize_pool ?? 0}`,
    });

    return { url, text };
  };

  const handleNativeShare = async () => {
    if (!tournament) return;

    const payload = getSharePayload();
    if (!payload) return;

    const shared = await tryNativeShare({
      title: tournament.title,
      text: payload.text,
      url: payload.url,
    });

    if (!shared) {
      toast({
        title: "Share not available",
        description: "Use WhatsApp or Copy Link below.",
      });
    }
  };

  const handleWhatsAppShare = async () => {
    if (!tournament) return;

    const payload = getSharePayload();
    if (!payload) return;

    const opened = openWhatsAppShare(`${payload.text} ${payload.url}`);

    if (!opened) {
      const copied = await copyToClipboard(`${payload.text} ${payload.url}`);
      toast({
        title: copied ? "Copied" : "Share failed",
        description: copied
          ? "WhatsApp popup blocked. Paste the copied message in WhatsApp."
          : "Unable to open WhatsApp or copy the message.",
        variant: copied ? undefined : "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    if (!tournament) return;

    const url = buildTournamentShareUrl(tournament.id);
    const copied = await copyToClipboard(url);
    toast({
      title: copied ? "Link copied" : "Copy failed",
      description: copied
        ? "Tournament link copied to clipboard."
        : "Unable to copy link. Please try again.",
      variant: copied ? undefined : "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Tournament</DialogTitle>
          <DialogDescription>
            Share {tournament?.title} with friends
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {tournament && (
            <TournamentQRCode
              tournamentId={tournament.id}
              tournamentTitle={tournament.title}
              onDownload={() =>
                toast({
                  title: "Downloaded",
                  description: "QR code saved to your device.",
                })
              }
            />
          )}

          <div className="grid gap-2">
            <Button
              variant="outline"
              onClick={handleNativeShare}
              disabled={!tournament}
              className="w-full"
            >
              Share (Phone)
            </Button>

            <Button
              variant="outline"
              onClick={() => void handleWhatsAppShare()}
              disabled={!tournament}
              className="w-full gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share on WhatsApp
            </Button>

            <Button
              variant="outline"
              onClick={() => void handleCopyLink()}
              disabled={!tournament}
              className="w-full"
            >
              Copy Link
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: Your friends can scan the QR code using the Scanner button.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
