import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db/syncNotesDb";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Fragment } from "react/jsx-runtime";
import { AppSidebar } from "./-components/AppSidebar";

export const Route = createFileRoute("/_auth/notes")({
  component: Index,
});

function Index() {
  const notes = useLiveQuery(() => db.notes.toArray());

  if (!notes) {
    return (
      <Fragment>
        <ResizablePanelGroup orientation="horizontal" className="min-h-max">
          <ResizablePanel defaultSize="25%">
            <div className="grid h-full items-center border rounded">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(
                (note: number) => {
                  return (
                    <div key={note}>
                      <Button
                        variant="ghost"
                        className="duration-500 animate-pulse"
                      ></Button>
                    </div>
                  );
                },
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="75%">
            <div className="flex h-full items-start justify-start p-6">
              <div className="animate-pulse duration-500" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <SidebarProvider>
        <AppSidebar notes={notes} />
        <SidebarInset className="">
          <div className="w-full h-screen">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Fragment>
  );
}
