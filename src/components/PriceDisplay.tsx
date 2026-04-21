/**
 * PriceDisplay — shows a price in its native currency,
 * with an optional converted equivalent in the deployment currency.
 */
import { formatPrice } from '@/lib/currency';
import { useDeploymentCurrency } from '@/hooks/useDeploymentCurrency';

interface PriceDisplayProps {
  amount: number;
  currency: string;
  showConversion?: boolean;
  className?: string;
  conversionClassName?: string;
}

export default function PriceDisplay({
  amount,
  currency,
  showConversion = true,
  className,
  conversionClassName,
}: PriceDisplayProps) {
  const { country, convert } = useDeploymentCurrency();
  const native = formatPrice(amount, currency);

  if (!showConversion || currency === country.currency) {
    return <span className={className}>{native}</span>;
  }

  const converted = convert(amount, currency);
  return (
    <span className={className}>
      {native}
      {converted !== null && (
        <span className={conversionClassName ?? 'ml-1 text-xs text-muted-foreground'}>
          (≈ {formatPrice(converted, country.currency)})
        </span>
      )}
    </span>
  );
}
