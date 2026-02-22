import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";
import { extractApiErrorMessage, getUsers, updateUserRole } from "@/lib/api";
import { EMPTY_BANK_DETAILS, readBankDetails, writeBankDetails } from "@/lib/bank-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BankDetails, User, UserRole } from "@/types/api";

export const Route = createFileRoute("/dashboard/admin")({
  component: DashboardAdminPage,
});

function DashboardAdminPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRoleFor, setIsSavingRoleFor] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedBankUserId, setSelectedBankUserId] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetails>(EMPTY_BANK_DETAILS);

  const isAdmin = session?.user.role.toLowerCase() === "admin";

  const npoUsers = useMemo(
    () => users.filter((user) => user.role.toLowerCase() === "npo"),
    [users],
  );

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    async function loadUsers() {
      setErrorMessage(null);
      setIsLoading(true);

      try {
        const usersResponse = await getUsers();
        setUsers(usersResponse);
        setRoleDrafts(
          Object.fromEntries(usersResponse.map((user) => [user.id, user.role])) as Record<string, UserRole>,
        );

        const defaultNpoId = usersResponse.find((user) => user.role.toLowerCase() === "npo")?.id ?? "";
        setSelectedBankUserId(defaultNpoId);
        setBankDetails(defaultNpoId ? readBankDetails(defaultNpoId) : { ...EMPTY_BANK_DETAILS });
      } catch (error) {
        setErrorMessage(extractApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>Only admin users can access this section.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onBankDetailChange<K extends keyof BankDetails>(field: K, value: BankDetails[K]) {
    setBankDetails((current) => ({ ...current, [field]: value }));
  }

  async function onSaveRole(userId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingRoleFor(userId);

    try {
      const role = roleDrafts[userId];
      await updateUserRole(userId, role);
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, role } : user)),
      );
      setSuccessMessage("User role updated.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsSavingRoleFor(null);
    }
  }

  function onSaveBankDetails() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedBankUserId) {
      setErrorMessage("Please select an NPO user.");
      return;
    }

    writeBankDetails(selectedBankUserId, bankDetails);
    setSuccessMessage("NPO bank details saved (local browser storage).");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Configuration</CardTitle>
          <CardDescription>
            Manage users, roles, and local NPO receiving bank details.
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

          {isLoading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Role Management</CardTitle>
          <CardDescription>Admin has full access. NPO and Donor permissions depend on role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-md border p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={String(roleDrafts[user.id] ?? user.role)}
                    onChange={(event) =>
                      setRoleDrafts((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="Admin">Admin</option>
                    <option value="Npo">NPO</option>
                    <option value="Donor">Donor</option>
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingRoleFor === user.id}
                    onClick={() => {
                      void onSaveRole(user.id);
                    }}
                  >
                    {isSavingRoleFor === user.id ? "Saving..." : "Save Role"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Current frontend permission model used by the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Projects</th>
                  <th className="py-2 pr-3">Users / Roles</th>
                  <th className="py-2 pr-3">Profile</th>
                  <th className="py-2 pr-3">Bank Details</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium">Admin</td>
                  <td className="py-2 pr-3">Full CRUD + approval</td>
                  <td className="py-2 pr-3">Full access</td>
                  <td className="py-2 pr-3">Own profile</td>
                  <td className="py-2 pr-3">Configure any NPO (local storage)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-3 font-medium">NPO</td>
                  <td className="py-2 pr-3">Own projects CRUD</td>
                  <td className="py-2 pr-3">No admin access</td>
                  <td className="py-2 pr-3">Own profile</td>
                  <td className="py-2 pr-3">Own bank details (local storage)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium">Donor</td>
                  <td className="py-2 pr-3">Read-only dashboard</td>
                  <td className="py-2 pr-3">No admin access</td>
                  <td className="py-2 pr-3">Own profile</td>
                  <td className="py-2 pr-3">No project management</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NPO Bank Details</CardTitle>
          <CardDescription>
            Configure NPO receiving account details (stored in browser local storage until backend API is available).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="admin-bank-user">NPO User</Label>
            <select
              id="admin-bank-user"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedBankUserId}
              onChange={(event) => {
                const userId = event.target.value;
                setSelectedBankUserId(userId);
                setBankDetails(userId ? readBankDetails(userId) : { ...EMPTY_BANK_DETAILS });
              }}
            >
              <option value="">Select NPO user</option>
              {npoUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-bank-holder">Account Holder Name</Label>
            <Input
              id="admin-bank-holder"
              value={bankDetails.accountHolderName}
              onChange={(event) => onBankDetailChange("accountHolderName", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-bank-name">Bank Name</Label>
            <Input
              id="admin-bank-name"
              value={bankDetails.bankName}
              onChange={(event) => onBankDetailChange("bankName", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-account-number">Account Number</Label>
            <Input
              id="admin-account-number"
              value={bankDetails.accountNumber}
              onChange={(event) => onBankDetailChange("accountNumber", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-routing-number">Routing Number</Label>
            <Input
              id="admin-routing-number"
              value={bankDetails.routingNumber}
              onChange={(event) => onBankDetailChange("routingNumber", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-iban">IBAN</Label>
            <Input
              id="admin-iban"
              value={bankDetails.iban}
              onChange={(event) => onBankDetailChange("iban", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-swift">SWIFT Code</Label>
            <Input
              id="admin-swift"
              value={bankDetails.swiftCode}
              onChange={(event) => onBankDetailChange("swiftCode", event.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="button" onClick={onSaveBankDetails}>
              Save NPO Bank Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
