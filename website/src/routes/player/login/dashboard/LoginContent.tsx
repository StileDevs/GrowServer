import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import BlurFade from "@/components/ui/blur-fade";
import { Confetti, ConfettiRef } from "@/components/ui/confetti";

export function LoginContent() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);

  const [data, setData] = useState({
    growId: "",
    password: ""
  });

  const changeLogin = (e: ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const submitData = async () => {
    const res = await axios.post("/player/login/validate", {
      growId: data.growId,
      password: data.password
    });

    if (res.status !== 200) return toast("Failed to validate");

    setDone(true);

    setTimeout(() => {
      setOpen(false);
    }, 3000);
    setTimeout(() => {
      window.location.href = `/player/growid/login/validate?token=${res.data.token}`;
    }, 3500);
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

      <DrawerContent>
        {done ? (
          <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl">
            <span className="text-4xl font-bold">Success! 🎉</span>

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
              <DrawerTitle>Login</DrawerTitle>
              <DrawerDescription>Enter your growId below to login account</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-4 p-4">
              <div className="grid gap-2">
                <Label htmlFor="growId">GrowID</Label>
                <Input autoComplete="off" id="growId" type="text" name="growId" placeholder="Your growid" required onChange={changeLogin} />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input id="password" type="password" name="password" required onChange={changeLogin} />
              </div>
            </div>
            <DrawerFooter>
              <Button type="submit" className="w-full" onSubmit={() => submitData()} onClick={() => submitData()}>
                Login
              </Button>
              <DrawerClose>
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
