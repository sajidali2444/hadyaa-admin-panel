export type UserRole = "Admin" | "Npo" | "Donor" | string;

export interface ApiErrorShape {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  firstName: string;
  lastName: string;
  displayName: string;
  mobileNumber?: string | null;
  avatarPath?: string | null;
}

export interface Category {
  id: number;
  name: string;
  createdOn?: string;
  modifiedOn?: string | null;
  imageFileName?: string | null;
  imageContentType?: string | null;
  imagePath?: string | null;
}

export interface Address {
  id?: string;
  country: string;
  state: string;
  city: string;
}

export interface ProjectImage {
  id: string;
  fileName: string;
  contentType?: string | null;
  storagePath: string;
}

export interface Project {
  id: string;
  npoUserId: string;
  title: string;
  categoryId: number;
  category?: Category | null;
  createdAt?: string;
  createdOn?: string;
  modifiedOn?: string | null;
  startDate: string;
  endDate?: string | null;
  description: string;
  targetAmount: number;
  currency: string;
  raisedAmount: number;
  addresses: Address[];
  images: ProjectImage[];
  videos: ProjectImage[];
  isApproved: boolean;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isNpo: boolean;
  mobileNumber?: string | null;
  avatarFileName?: string | null;
  avatarContentType?: string | null;
  avatarPath?: string | null;
  addresses: Address[];
}

export interface UpdateUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isNpo: boolean;
  mobileNumber?: string | null;
  avatarFileName?: string | null;
  avatarContentType?: string | null;
  avatarPath?: string | null;
  addresses: Address[];
}

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  routingNumber: string;
}
