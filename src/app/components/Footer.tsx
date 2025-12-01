import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#ffffff1a] pt-[64px] pb-8 px-10 relative overflow-hidden">
      <div className="max-w-[1200px] w-full mx-auto flex gap-6 md:gap-8 flex-col md:flex-row md:justify-between relative z-30">
        <div className="flex flex-col gap-7.5">
          <div>
            <Link href="/" className="text-[28px] font-medium">
              Runwise
            </Link>

            <p className="max-w-[350px] text-[#ffffffb3] text-base leading-[1.2em] -tracking-[.02em] font-light mt-2.5">
              Transform your ideas into automated workflows with AI. No coding required.
            </p>
          </div>

          <ul className="flex items-center gap-2.5 mt-4">
            <li>
              <Link
                href="https://x.com/runwise_ai"
                target="_blank"
                className="bg-transparent rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img src="/assets/icons/x.svg" alt="x" className="w-5 h-5" />
              </Link>
            </li>

            <li>
              <Link
                href="https://www.instagram.com/runwise.official/"
                target="_blank"
                className="bg-transparent rounded-lg w-7.5 h-7.5 flex items-center justify-center"
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
                className="bg-transparent rounded-lg w-7.5 h-7.5 flex items-center justify-center"
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

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Navigation column */}
          <ul className="flex flex-col gap-y-2.5 min-w-[140px]">
            <li className="text-base font-normal -tracking-[.02em] leading-[1.4em] hover:text-white">
              Navigation
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
          </ul>

          {/* Contact column */}
          <ul className="flex flex-col gap-y-2.5 min-w-[180px]">
            <li className="text-base font-normal -tracking-[.02em] leading-[1.4em] hover:text-white">
              Contact
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <a href="mailto:hello@runwiseai.app">Email: hello@runwiseai.app</a>
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <a href="tel:+640223591512">Phone: +64 022 359 1512</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="w-full border-t border-[#ffffff1a] mt-6 pt-4 pb-0 relative z-30">
        <div className="max-w-[1200px] w-full mx-auto">
          <p className="text-center text-sm text-[#ffffff80] font-light leading-[1.4em] -tracking-[.02em]">
            © {new Date().getFullYear()} Runwise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
