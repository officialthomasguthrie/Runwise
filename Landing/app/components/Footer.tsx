import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#ffffff1a] py-[64px] px-10 relative overflow-hidden">
      <div className="max-w-[1200px] w-full mx-auto flex gap-6 md:gap-2.5 flex-col md:flex-row relative z-30">
        <div className="flex-3 flex flex-col gap-7.5">
          <div>
            <Link href="/" className="text-[28px] font-medium">
              Runwise
            </Link>

            <p className="max-w-[350px] text-[#ffffffb3] text-base leading-[1.2em] -tracking-[.02em] font-light mt-2.5">
              Your trusted partner in AI solutions, creating smarter systems for
              smarter businesses.
            </p>
          </div>

          <ul className="flex items-center gap-2.5">
            <li>
              <Link
                href="https://x.com/runwise_ai"
                target="_blank"
                className="bg-[#ffffff33] rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img src="/assets/icons/x.svg" alt="x" className="w-5 h-5" />
              </Link>
            </li>

            <li>
              <Link
                href="https://www.instagram.com/runwise.official/"
                target="_blank"
                className="bg-[#ffffff33] rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img
                  src="/assets/icons/instagram.svg"
                  alt="instagram"
                  className="w-5 h-5"
                />
              </Link>
            </li>

            <li>
              <Link
                href="https://facebook.com"
                target="_blank"
                className="bg-[#ffffff33] rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img
                  src="/assets/icons/facebook.svg"
                  alt="facebook"
                  className="w-5 h-5"
                />
              </Link>
            </li>
          </ul>
        </div>

        <ul className="flex-1 flex flex-col gap-y-2.5">
          <li className="text-base font-normal -tracking-[.02em] leading-[1.4em] hover:text-white">
            Pages
          </li>
          <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
            <Link href="#process">Process</Link>
          </li>

          <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
            <Link href="#possibilities">Services</Link>
          </li>

          <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
            <Link href="#benefits">Benefits</Link>
          </li>

          <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
            <Link href="#pricing">Plans</Link>
          </li>

          <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
            <Link href="#contact">Contact</Link>
          </li>
        </ul>
      </div>

      {/* Background Blur shadow  */}
      <div
        className="absolute w-[923px] h-[328px] opacity-90 blur-[50px] z-10 overflow-hidden top-20 md:top-0 bottom-0"
        style={{
          left: "calc(50% - 461.5px)",
          
        }}
      >
        <img
          src="/assets/img5.png"
          alt="img"
          loading="lazy"
          className="opacity-50 bg-cover bg-center"
        />
      </div>
    </footer>
  );
};
