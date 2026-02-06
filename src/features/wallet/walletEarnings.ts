export type WalletTransactionLike = {
  type: string | null;
  amount: number;
  status: string | null;
  description?: string | null;
  created_at: string;
};

export type WithdrawableBreakdownItem = {
  tournamentName: string;
  amount: number;
  date: string;
  type: string;
  position?: string;
};

const normalizeType = (type: string | null | undefined) =>
  (type ?? '').toLowerCase().trim();

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? '').toLowerCase().trim();

const isCompleted = (t: WalletTransactionLike) => normalizeStatus(t.status) === 'completed';

export const isWithdrawableEarningType = (type: string | null | undefined) => {
  const t = normalizeType(type);
  return t === 'winning' || t === 'prize' || t === 'prize_won' || t.includes('commission');
};

export const getWithdrawableEarningTransactions = <T extends WalletTransactionLike>(
  txns: T[]
) => txns.filter((t) => isCompleted(t) && isWithdrawableEarningType(t.type));

export const computeWithdrawableFromTransactions = (txns: WalletTransactionLike[]) => {
  const earningTotal = getWithdrawableEarningTransactions(txns).reduce(
    (sum, t) => sum + Math.abs(t.amount || 0),
    0
  );

  const withdrawnTotal = txns
    .filter(
      (t) =>
        isCompleted(t) &&
        normalizeType(t.type) === 'withdrawal'
    )
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  return Math.max(0, earningTotal - withdrawnTotal);
};

export const buildWithdrawableBreakdown = (
  earningTxns: WalletTransactionLike[]
): WithdrawableBreakdownItem[] => {
  return earningTxns.map((t) => {
    let tournamentName = normalizeType(t.type).includes('commission')
      ? 'Commission'
      : 'Tournament Prize';

    let position = '';

    if (t.description) {
      const match = t.description.match(
        /(?:Prize|Won|Winning|Commission).*?(?:for|from|in)\s+(.+?)(?:\s*-\s*Rank\s*(\d+))?$/i
      );
      if (match) {
        tournamentName = match[1] || t.description;
        position = match[2] ? `Rank ${match[2]}` : '';
      } else {
        tournamentName = t.description;
      }
    }

    return {
      tournamentName,
      amount: Math.abs(t.amount || 0),
      date: t.created_at,
      type: t.type ?? '',
      position,
    };
  });
};
