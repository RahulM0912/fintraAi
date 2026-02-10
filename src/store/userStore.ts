import { AuthState } from "@/types/store";
import { create } from "zustand/react";

export const useUserStore = create<AuthState>(() => ({
  isAuthenticated: false,
  userName: "Rahul"
}))