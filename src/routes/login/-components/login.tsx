import type z from "zod";
import { loginSchema } from "../-schema/schema";
import { Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { BASE_URL } from "@/constants";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import IconV1 from "@/assets/variant-1.svg?react";
import { ApiError } from "@/lib/ApiError";

type ZFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: async (loginValues: ZFormValues) => {
      const result = await fetch(`${BASE_URL}/auth/signin`, {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(loginValues),
        credentials: "include",
      });

      if (!result.ok) {
        const error: ApiError = await result.json();
        if (error?.statusCode === 403) {
          const email = form.getValues('email');
          router.navigate({
            to: '/verify-email',
            search: { email },
          })
        }
        throw error;
      }
      return result.json();
    },
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({
        to: "/notes",
        viewTransition: {
          types: ["slide-left"],
        },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 403) {
        const email = form.getValues('email');
        router.navigate({
          to: '/verify-email',
          search: { email },
        })
      } else {
        toast.error("Invalid credentials");
      }
    },
  });

  const form = useForm<ZFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(loginValues: ZFormValues) {
    mutate(loginValues);
  }

  return (
    <div className="h-full w-full flex flex-col">
      <Header className={"px-4 py-4 border border-b justify-between"}>
        <div className="text-white size-10">
          <Link to="/">
            <IconV1 className="w-full h-full" />
          </Link>
        </div>
        <Button>
          <Link to="/" viewTransition={{ types: ["slide-right"] }}>
            Home
          </Link>
        </Button>
      </Header>
      <Card className="w-[50%] mx-auto mt-[5%]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Login to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="email@example.com"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <FieldGroup>
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="*******"
                      autoComplete="off"
                      type="password"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button type="submit" disabled={isPending}>Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
