import { UNITS, type UnitCode } from '../data/units';
import styles from './QuantityField.module.css';

interface QuantityFieldProps {
  /** Text rather than a number so the field can be empty or half-written while typing. */
  quantity: string;
  unit: UnitCode;
  onQuantity: (value: string) => void;
  onUnit: (unit: UnitCode) => void;
}

export default function QuantityField({ quantity, unit, onQuantity, onUnit }: QuantityFieldProps) {
  return (
    <div className={styles.field}>
      <input
        className={styles.amount}
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={quantity}
        aria-label="Quantity"
        onChange={(e) => onQuantity(e.target.value)}
      />
      <span className={styles.unitWrap}>
        <select
          className={styles.unit}
          value={unit}
          aria-label="Unit"
          onChange={(e) => onUnit(e.target.value as UnitCode)}
        >
          {UNITS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}
