import { LoginContent } from "./LoginContent";
import { useEffect } from "react";
import { RegisterContent } from "./RegisterContent";
import { Particles } from "@/components/ui/particles";
import { LetterPullup } from "@/components/ui/letter-pullup";

export function DashboardRoute() {
  useEffect(() => {
    document.body.style.backgroundColor = "rgba(0,0,0,0.0)";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="pt-32">
      <LetterPullup words={"Welcome to GrowServer"} delay={0.05} className="mb-2" />
      <div className="text-4xl">
        <div className="w-1/2 m-auto flex justify-center items-center flex-col gap-y-1">
          <LoginContent />
          <RegisterContent />
        </div>
        <Particles className="absolute inset-0 -z-10" quantity={100} ease={80} color={"#fefefe"} refresh />
      </div>
    </div>
  );
}
