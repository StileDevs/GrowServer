import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import axios from "axios";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import BlurFade from "@/components/ui/blur-fade";
import { Confetti, ConfettiRef } from "@/components/ui/confetti";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const formSchema = z
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

export function RegisterContent() {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      growId: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const res = await axios.post("/player/signup", {
        growId: data.growId,
        password: data.password,
        confirmPassword: data.confirmPassword
      });

      if (res.status !== 200) throw new Error("Failed to validate");

      setDone(true);

      setTimeout(() => {
        setOpen(false);
      }, 3000);
      setTimeout(() => {
        window.location.href = `/player/growid/login/validate?token=${res.data.token}`;
      }, 3500);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to create new account",
        duration: 2000
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <BlurFade delay={1.5} className="w-full">
        <DrawerTrigger className="w-full">
          <div className="w-full">
            <Button className="w-full">Register</Button>
          </div>
        </DrawerTrigger>
      </BlurFade>

      <DrawerContent className="h-[100vh] max-h-[100vh] sm:h-[90vh] sm:max-h-[90vh] md:h-auto pb-6">
        {done ? (
          <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl">
            <span className="text-4xl font-bold">Success to create new account! 🎉</span>

            <Confetti
              ref={confettiRef}
              className="absolute left-0 top-0 z-0 size-full"
              onMouseEnter={() => {
                confettiRef.current?.fire({});
              }}
            />
          </div>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle className="text-lg">Register your account</DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-2 px-4 pb-4">
              <Toaster />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="growId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">GrowID</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" placeholder="Username" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" placeholder="********" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" placeholder="********" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Sign Up
                  </Button>
                </form>
              </Form>
              <DrawerClose className="mt-2">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
