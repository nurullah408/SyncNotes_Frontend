import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react';
import { resetPasswordSchema } from './-schema/schema';
import { z } from 'zod';
import { BASE_URL } from '@/constants';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import IconV1 from "@/assets/variant-1.svg?react";

const resetPasswordSearchSchema = z.object({
  token: z.string(),
})

export const Route = createFileRoute('/reset-password/')({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPassword,
});

type ZFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPassword() {
  const { token } = Route.useSearch();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState<'password' | 'text'>('password');

  const { mutate, isPending } = useMutation({
    mutationFn: async (signupValues: ZFormValues) => {
      const result = await fetch(`${BASE_URL}/auth/reset-password`, {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ ...signupValues, token }),
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
        to: "/login",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Something went wrong.");
    },
  });

  const form = useForm<ZFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  const onSubmit = (signupValues: ZFormValues) => {
    mutate(signupValues);
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
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Reset the password for your account</CardDescription>
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
                    <div className="flex items-center">
                      <Input
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="*******"
                      autoComplete="off"
                      type={showPassword}
                    />
                    <Button variant={'ghost'} className="h-10" type="button" onClick={() => setShowPassword(showPassword === 'password' ? 'text' : 'password')}>
                      {showPassword === 'password' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <div className="flex items-center">
                      <Input
                      {...field}
                      id="confirmPassword"
                      aria-invalid={fieldState.invalid}
                      placeholder="*******"
                      autoComplete="off"
                      type={showPassword}
                    />
                    <Button variant={'ghost'} className="h-10" type="button" onClick={() => setShowPassword(showPassword === 'password' ? 'text' : 'password')}>
                      {showPassword === 'password' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button type="submit" disabled={isPending}>Signup</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
