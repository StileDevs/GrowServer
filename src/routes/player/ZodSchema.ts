import { z } from "zod";

export const LoginSchema = z.object({
  growId: z
    .string()
    .min(5, {
      message: "GrowID must be at least 5 characters."
    })
    .max(20, {
      message: "GrowID are too long."
    })
    .refine((v) => !/[!@#$%^&*(),.?":{}|<> ]/.test(v), {
      message: "GrowID are contains special characters."
    }),
  password: z.string().min(5, {
    message: "Password must contains at least 5 characters long."
  })
});

export const RegisterSchema = z
  .object({
    growId: z
      .string()
      .min(5, {
        message: "GrowID must be at least 5 characters."
      })
      .max(20, {
        message: "GrowID are too long."
      })
      .refine((v) => !/[!@#$%^&*(),.?":{}|<> ]/.test(v), {
        message: "GrowID are containing special characters."
      }),
    password: z.string().min(5, {
      message: "Password must contains at least 5 characters long."
    }),
    confirmPassword: z.string().min(5, {
      message: "Password must contains at least 5 characters long."
    })
  })
  .refine(
    (v) => {
      return v.password === v.confirmPassword;
    },
    {
      message: "Password must match!",
      path: ["confirmPassword"]
    }
  );
