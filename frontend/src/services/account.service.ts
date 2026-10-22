import { apiRequest } from "@/lib/api/client";
import type { FavoriteSport, User } from "@/lib/api/types";

export interface UpdateProfileInput {
  /** null clears the display name. */
  displayName: string | null;
  username: string;
  /** null clears it. */
  bio: string | null;
  /** null clears it. */
  city: string | null;
  favoriteSports: FavoriteSport[];
  /** `#rrggbb`; null restores the default hue. */
  profileColor: string | null;
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
}

export interface DeleteAccountInput {
  password?: string;
  usernameConfirmation?: string;
}

export const accountService = {
  updateProfile: (input: Partial<UpdateProfileInput>) =>
    apiRequest<User>("/users/me", { method: "PATCH", body: { json: input } }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<User>("/users/me/avatar", { method: "PUT", body: { formData } });
  },

  removeAvatar: () => apiRequest<User>("/users/me/avatar", { method: "DELETE" }),

  changePassword: (input: ChangePasswordInput) =>
    apiRequest("/users/me/password", { method: "PUT", body: { json: input } }),

  deleteAccount: (input: DeleteAccountInput) =>
    apiRequest("/users/me", { method: "DELETE", body: { json: input } }),
};
