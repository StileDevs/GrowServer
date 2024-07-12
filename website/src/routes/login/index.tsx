import { Navbar } from "@/components/header/navbar";
import { LoginContent } from "./LoginContent";
import { useEffect } from "react";

export function LoginRoute() {
  useEffect(() => {
    document.body.style.backgroundColor = "rgba(0,0,0,0.0)";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <>
      <LoginContent />
    </>
  );
}
