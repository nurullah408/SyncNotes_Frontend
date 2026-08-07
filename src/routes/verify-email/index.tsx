import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { verifyEmailSchema } from "./-schema/schema";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { BASE_URL } from "@/constants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import IconV1 from "@/assets/variant-1.svg?react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ApiError } from "@/lib/ApiError";

const verifyEmailSearchSchema = z.object({
  email: z.email()
})

export const Route = createFileRoute("/verify-email/")({
  validateSearch: verifyEmailSearchSchema,
  component: Index,
});

type ZFormValues = z.infer<typeof verifyEmailSchema>;

function Index() {

  const router = useRouter();
  const { email } = Route.useSearch();

  const { mutate:VerifyEmail, isPending: isVerifying } = useMutation({
    mutationFn: async (values: ZFormValues) => {
      const result = await apiClient(`${BASE_URL}/auth/verify-email`, {
        skipRefresh: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        method: "POST",
      });

      if (!result.ok) {
        const error = await result.json();
        throw new ApiError(error, error?.message);
      }
      return result.json();
    },
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({
        to: '/notes',
        viewTransition: {
          types: ['slide-left']
        }
      });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Something went wrong.");
    },
  });

  const { mutate: resendOtp, isPending: isResending } = useMutation({
    mutationFn: async (values: ZFormValues['email']) => {
      const result = await apiClient(`${BASE_URL}/auth/resend-otp`, {
        skipRefresh: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: values }),
        method: "POST",
      });
      return result.json();
    },
    onSuccess: () => {
      toast.success("OTP resent successfully.");
    },
    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  const form = useForm<ZFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: email ?? "",
      otp: "",
    }
  });

  const onResendOtp = () => {
    form.reset({
      email: email ?? "",
    });
    resendOtp(email);
  }

  const onSubmit = (values: ZFormValues) => {
    VerifyEmail(values);
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
          <CardTitle>Verify Email</CardTitle>
          <CardDescription>Verify your email to continue</CardDescription>
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
                      autoComplete="off"
                      readOnly
                      className="bg-muted text-muted-foreground"
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
                name="otp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="otp">OTP</FieldLabel>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button type="button" onClick={onResendOtp} disabled={isResending}>Resend OTP</Button>
            <Button type="submit" disabled={isVerifying}>Verify</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
