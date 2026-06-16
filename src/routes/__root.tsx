import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { User } from "@/types/User";
import { Toaster } from "sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ModalManager } from "@/components/modals/ModalManager";

interface AuthenticatedRouterContext {
  user: User | null;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<AuthenticatedRouterContext>()({
  component: () => (
    <>
      <Outlet />
      <Toaster />
      <ModalManager />
      <TanStackRouterDevtools />
    </>
  ),
});
