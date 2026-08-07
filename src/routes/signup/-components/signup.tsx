import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { signupSchema } from "../-schema/schema";
import { BASE_URL } from "@/constants";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/header";
import IconV1 from "@/assets/variant-1.svg?react";
import type z from "zod";
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

type ZFormValues = z.infer<typeof signupSchema>;

export function Signup() {
  const router = useRouter();

  const signupMutation = useMutation({
    mutationFn: async (signupValues: ZFormValues) => {
      const result = await fetch(`${BASE_URL}/auth/signup`, {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(signupValues),
        credentials: "include",
      });

      if (!result.ok) {
        const error = await result.json();
        console.log(error);
        throw new Error(error);
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
      console.log(error);
      toast.error("Something went wrong.");
    },
  });

  const form = useForm<ZFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(signupValues: ZFormValues) {
    signupMutation.mutate(signupValues);
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
          <CardTitle>Signup</CardTitle>
          <CardDescription>Signup to create an account</CardDescription>
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
            <Button type="submit">Signup</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
