import { LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { authQueryOptions } from "@/lib/auth-query";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/constants";
import { queryClient } from "@/lib/query-client";
import { useNavigate } from "@tanstack/react-router";

interface ProfileSettingsProps {}

export default function ProfileSettings({
}: ProfileSettingsProps) {

  const navigate = useNavigate();

  const data = useQuery(authQueryOptions);

  const user = data?.data;

  const initials = user?.name?.split(' ').map((n:string) => n[0].toUpperCase()).join('');

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/auth/signout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error(error);
    } finally {
      queryClient.clear();
      navigate({ to: "/login" });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" asChild>
        {initials ?? "U"}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 size-4" /> Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
