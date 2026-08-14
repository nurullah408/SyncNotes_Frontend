import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import IconV1 from "@/assets/variant-1.svg?react";
import { useMutation } from '@tanstack/react-query'
import { forgotPasswordSchema } from './-schema/schema'
import { z } from 'zod';
import { apiClient } from '@/lib/api-client'
import { BASE_URL } from '@/constants'
import { ApiError } from '@/lib/ApiError'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'

export const Route = createFileRoute('/forgot-password/')({
  component: ForgotPassword,
});

type ZFormValues = z.infer<typeof forgotPasswordSchema>

function ForgotPassword() {

  const [submitted, setSubmitted] = useState(false);


  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ZFormValues) => {
      const result = await apiClient(`${BASE_URL}/auth/forgot-password`, {
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!result.ok) {
        const errorBody = await result.json();
        throw new ApiError(result.status, errorBody?.message ?? "Something went wrong.");
      }

      return result.json();
    },
    onSuccess: async () => {
      setSubmitted(true);
    },
    onError: () => {
      setSubmitted(false);
    },
  });

  const form = useForm<ZFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ZFormValues) => {
    mutate(data);
  };


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
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your email to reset your password</CardDescription>
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
            <Button type="submit" disabled={isPending}>Submit</Button>
          </form>
          <div className="flex items-center gap-2 justify-center my-4">
            <hr className="w-1/3 h-1" /><span>OR</span><hr className="w-1/3 h-1" />
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span>Don't have an account? </span>
            <Link to="/signup" className="underline underline-offset-1" viewTransition={{ types: ["slide-right"] }}>
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
