import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";
import { AppSidebar } from "./-components/AppSidebar";
import { SyncProvider } from "@/context/SyncContext";
import { SyncManager } from "@/components/SyncManager";
import { ModalManager } from "@/components/modals/ModalManager";

export const Route = createFileRoute("/_auth/notes")({
  component: Index,
});

function Index() {
  return (
    <Fragment>
      <SyncProvider>
        <SyncManager />
        <ModalManager />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="">
            <div className="w-full h-screen">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </SyncProvider>
    </Fragment>
  );
}
