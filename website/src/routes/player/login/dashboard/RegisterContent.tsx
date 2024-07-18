import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import BlurFade from "@/components/ui/blur-fade";

export function RegisterContent() {
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

    window.location.href = `/player/growid/login/validate?token=${res.data.token}`;
  };

  return (
    <Drawer>
      <BlurFade delay={1.7} className="w-full">
        <DrawerTrigger className="w-full">
          <Button className="w-full">Register</Button>
        </DrawerTrigger>
      </BlurFade>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Register</DrawerTitle>
          <DrawerDescription>Enter your growId below to create new account</DrawerDescription>
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
      </DrawerContent>
    </Drawer>
  );
}
