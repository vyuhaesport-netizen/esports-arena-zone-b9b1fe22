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

/**
 * Types that count as WITHDRAWABLE earnings:
 * - prize, prize_won, winning (tournament winnings)
 * - commission, organizer_commission (organizer/creator/local/referral commissions)
 * 
 * NOT included (these go to Total Balance only):
 * - deposit, admin_credit, refund, bonus
 */
export const isWithdrawableEarningType = (type: string | null | undefined) => {
  const t = normalizeType(type);
  // Prize winnings
  if (t === 'winning' || t === 'prize' || t === 'prize_won') return true;
  // All commission types (organizer_commission, commission, etc.)
  if (t.includes('commission')) return true;
  return false;
};

export const getWithdrawableEarningTransactions = <T extends WalletTransactionLike>(
  txns: T[]
) => txns.filter((t) => isCompleted(t) && isWithdrawableEarningType(t.type));

/**
 * Calculate withdrawable amount from transactions only.
 * Formula: (all earnings) - (all completed withdrawals)
 */
export const computeWithdrawableFromTransactions = <T extends WalletTransactionLike>(txns: T[]) => {
  // Filter earning transactions inline to avoid type issues
  const earningTxns = txns.filter((t) => {
    const statusNorm = normalizeStatus(t.status);
    const typeNorm = normalizeType(t.type);
    const isComp = statusNorm === 'completed';
    const isEarn = typeNorm === 'winning' || typeNorm === 'prize' || typeNorm === 'prize_won' || typeNorm.includes('commission');
    return isComp && isEarn;
  });

  const earningTotal = earningTxns.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );

  const withdrawnTotal = txns
    .filter((t) => {
      const statusNorm = normalizeStatus(t.status);
      const typeNorm = normalizeType(t.type);
      return statusNorm === 'completed' && typeNorm === 'withdrawal';
    })
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  return Math.max(0, earningTotal - withdrawnTotal);
};

export const buildWithdrawableBreakdown = (
  earningTxns: WalletTransactionLike[]
): WithdrawableBreakdownItem[] => {
  return earningTxns.map((t) => {
    const typeNorm = normalizeType(t.type);
    let tournamentName = typeNorm.includes('commission')
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

