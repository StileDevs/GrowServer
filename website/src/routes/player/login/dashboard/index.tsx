import { LoginContent } from "./LoginContent";
import { useEffect, useState } from "react";
import { RegisterContent } from "./RegisterContent";
import { LetterPullup } from "@/components/ui/letter-pullup";
import { ImagePulldown as ImageFall } from "@/components/ui/image-falldown";

export function DashboardRoute() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = "rgba(0,0,0,0.0)";
    
    // ตั้งเวลาให้แสดงเนื้อหาส่วนที่เหลือหลังจาก ImageFall แสดงเสร็จ
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1500); // ปรับเวลาตามที่ต้องการ (เช่น 1.5 วินาที)

    return () => {
      document.body.style.backgroundColor = "";
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="pt-32">
      <ImageFall
        imageUrl="https://github.com/JadlionHD/GrowServer/blob/main/assets/ignore/banner.png?raw=true"
        alt="Server Logo"
        delay={1}
      />
      {showContent && (
        <>
          <LetterPullup words={"GrowServer"} delay={0.05} className="mb-2" />
          <div className="text-4xl">
            <div className="w-1/2 m-auto flex justify-center items-center flex-col gap-y-1">
              <LoginContent />
              <RegisterContent />
            </div>
          </div>
        </>
      )}
    </div>
  );
}