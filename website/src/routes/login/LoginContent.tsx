import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Vortex } from "@/components/ui/vortex";
import { ChangeEvent, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import axios from "axios";

export function LoginContent() {
  // const navigate = useNavigate();
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
    <>
      <Vortex backgroundColor="rgba(0,0,0,0.0)" className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-full">
        <Toaster />
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your growId below to login to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="growId">GrowID</Label>
                <Input autoComplete="off" id="growId" type="text" name="growId" placeholder="Your growid" required onChange={changeLogin} />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" name="password" required onChange={changeLogin} />
              </div>
              <Button type="submit" className="w-full" onSubmit={() => submitData()} onClick={() => submitData()}>
                Login
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href="#" className="underline">
                Sign up
              </a>
            </div>
          </CardContent>
        </Card>
      </Vortex>
    </>
  );
}
