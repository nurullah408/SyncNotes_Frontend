import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";
import { AppSidebar } from "./-components/AppSidebar";
import { useNotes } from "./-hooks/useNotes.ts";
import { SyncManager } from "./-components/SyncManager.tsx";

export const Route = createFileRoute("/_auth/notes")({
  component: Index,
});

function Index() {
  const { data: notes, isLoading } = useNotes();

  return (
    <Fragment>
      <SidebarProvider>
        <SyncManager />
        <AppSidebar isLoading={isLoading} notes={notes} />
        <SidebarInset className="">
          <div className="w-full h-screen">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Fragment>
  );
}
