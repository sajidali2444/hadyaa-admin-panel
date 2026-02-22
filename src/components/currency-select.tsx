interface CurrencySelectProps {
  id?: string;
  name: string;
  value: string;
  onChange: (currency: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "INR",
  "PKR",
  "CAD",
  "AUD",
  "JPY",
  "TRY",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "MYR",
  "SGD",
  "CHF",
];

export function CurrencySelect({
  id,
  name,
  value,
  onChange,
  disabled,
}: Readonly<CurrencySelectProps>) {
  const normalizedValue = (value || "USD").trim().toUpperCase();

  return (
    <select
      id={id}
      name={name}
      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      value={normalizedValue}
      onChange={(event) => onChange((event.target.value || "USD").toUpperCase())}
      disabled={disabled}
    >
      {CURRENCIES.map((currencyCode) => (
        <option key={currencyCode} value={currencyCode}>
          {currencyCode}
        </option>
      ))}
    </select>
  );
}
