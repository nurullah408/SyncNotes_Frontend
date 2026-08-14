import { LogOut, Settings } from "lucide-react";
import { authQueryOptions } from "@/lib/auth-query";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/constants";
import { queryClient } from "@/lib/query-client";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";

interface IProfileProps {
  className?: string;
  children?: ReactNode;
}

export default function Profile({
  className = "",
  children,
}: IProfileProps) {

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
    }
    queryClient.clear();
    navigate({ to: "/login" });
  }

  const onClickSettings = () => {
    navigate({
      to: "/notes",
    })
  }

  const optionClasses = cn("justify-start rounded-xl", className);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="rounded-lg">
          <Avatar>
            <AvatarImage src={user?.image} />
            <AvatarFallback className='text-black'>{initials ?? 'U'}</AvatarFallback>
          </Avatar>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end"  className={cn("rounded-lg max-w-40 gap-2 p-1", className)}>
        {children}
        <Button variant="ghost" onClick={onClickSettings} className={optionClasses}>
          <Settings />
          Settings
        </Button>
        <Separator />
        <Button variant="destructive" onClick={handleLogout} className={optionClasses}>
          <LogOut />
          Logout
        </Button>
      </PopoverContent>
    </Popover>
  )
}
