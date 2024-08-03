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

const formSchema = z.object({
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
  })
});

export function LoginContent() {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      growId: "",
      password: ""
    }
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const res = await axios.post("/player/login/validate", {
        growId: data.growId,
        password: data.password
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
        title: "Failed to validate",
        duration: 2000
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <BlurFade delay={1.5} className="w-full">
        <DrawerTrigger className="w-full">
          <div className="w-full">
            <Button className="w-full">Login</Button>
          </div>
        </DrawerTrigger>
      </BlurFade>

      <DrawerContent className="h-[90vh] max-h-[90vh] sm:h-[85vh] sm:max-h-[85vh] md:h-auto">
        {done ? (
          <div className="relative flex h-[300px] sm:h-[400px] md:h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl">
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold">Success! 🎉</span>

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
              <DrawerTitle className="text-lg sm:text-xl md:text-2xl">Login with your GrowID</DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-4 px-4">
              <Toaster />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 md:space-y-8">
                  <FormField
                    control={form.control}
                    name="growId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GrowID</FormLabel>
                        <FormControl>
                          <Input placeholder="Username" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
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
                          <Input placeholder="********" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
              </Form>
              <DrawerClose>
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