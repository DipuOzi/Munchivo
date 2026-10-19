import { Minus, Plus } from "lucide-react";

type QuantityControlProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
};

export function QuantityControl({ value, onChange, label, className = "" }: QuantityControlProps) {
  return (
    <div className={`quantity-control ${className}`} aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        aria-label={`Decrease ${label} quantity`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} strokeWidth={2} aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label={`${value} selected`}>{value}</output>
      <button
        type="button"
        aria-label={`Increase ${label} quantity`}
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}