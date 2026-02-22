import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";
import { extractApiErrorMessage, updateOwnProfile } from "@/lib/api";
import { EMPTY_BANK_DETAILS, readBankDetails, writeBankDetails } from "@/lib/bank-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BankDetails } from "@/types/api";

export const Route = createFileRoute("/dashboard/profile")({
  component: DashboardProfilePage,
});

function DashboardProfilePage() {
  const { session, applyProfileUpdate } = useAuth();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetails>(EMPTY_BANK_DETAILS);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    setEmail(session.user.email ?? "");
    setFirstName(session.user.firstName ?? "");
    setLastName(session.user.lastName ?? "");
    setMobileNumber(session.user.mobileNumber ?? "");
    setBankDetails(readBankDetails(session.user.id));
  }, [session]);

  if (!session) {
    return null;
  }

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingProfile(true);

    try {
      const response = await updateOwnProfile(session.user.id, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: mobileNumber.trim(),
      });

      applyProfileUpdate(response);
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  }

  function onBankDetailChange<K extends keyof BankDetails>(
    field: K,
    value: BankDetails[K],
  ) {
    setBankDetails((current) => ({ ...current, [field]: value }));
  }

  function onSaveBankDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingBank(true);

    writeBankDetails(session.user.id, bankDetails);
    setSuccessMessage("Receiving bank details saved.");

    window.setTimeout(() => {
      setIsSavingBank(false);
    }, 250);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your account details. Changes are persisted to backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              {successMessage}
            </div>
          ) : null}

          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSaveProfile}>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-mobile">Mobile Number</Label>
              <Input
                id="profile-mobile"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-first-name">First Name</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Last Name</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receiving Bank Details</CardTitle>
          <CardDescription>
            NPO payout details. Backend endpoint is not available yet, so this is stored locally in browser storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSaveBankDetails}>
            <div className="space-y-2">
              <Label htmlFor="bank-holder">Account Holder Name</Label>
              <Input
                id="bank-holder"
                value={bankDetails.accountHolderName}
                onChange={(event) => onBankDetailChange("accountHolderName", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-name">Bank Name</Label>
              <Input
                id="bank-name"
                value={bankDetails.bankName}
                onChange={(event) => onBankDetailChange("bankName", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-account">Account Number</Label>
              <Input
                id="bank-account"
                value={bankDetails.accountNumber}
                onChange={(event) => onBankDetailChange("accountNumber", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-routing">Routing Number</Label>
              <Input
                id="bank-routing"
                value={bankDetails.routingNumber}
                onChange={(event) => onBankDetailChange("routingNumber", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-iban">IBAN</Label>
              <Input
                id="bank-iban"
                value={bankDetails.iban}
                onChange={(event) => onBankDetailChange("iban", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-swift">SWIFT Code</Label>
              <Input
                id="bank-swift"
                value={bankDetails.swiftCode}
                onChange={(event) => onBankDetailChange("swiftCode", event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSavingBank}>
                {isSavingBank ? "Saving..." : "Save Bank Details"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
