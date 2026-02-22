import type { BankDetails } from "@/types/api";

const BANK_KEY_PREFIX = "hadyaa.admin.bank.";

export const EMPTY_BANK_DETAILS: BankDetails = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
  routingNumber: "",
};

function getStorageKey(userId: string): string {
  return `${BANK_KEY_PREFIX}${userId}`;
}

export function readBankDetails(userId: string): BankDetails {
  if (typeof window === "undefined") {
    return { ...EMPTY_BANK_DETAILS };
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return { ...EMPTY_BANK_DETAILS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BankDetails>;
    return {
      accountHolderName: parsed.accountHolderName ?? "",
      bankName: parsed.bankName ?? "",
      accountNumber: parsed.accountNumber ?? "",
      iban: parsed.iban ?? "",
      swiftCode: parsed.swiftCode ?? "",
      routingNumber: parsed.routingNumber ?? "",
    };
  } catch {
    return { ...EMPTY_BANK_DETAILS };
  }
}

export function writeBankDetails(userId: string, details: BankDetails): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(details));
}
