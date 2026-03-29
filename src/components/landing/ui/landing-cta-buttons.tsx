"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

/**
 * Bottom-of-landing CTA actions: logged-out = trial + plans; logged-in = Dashboard (same control as legacy Header).
 */
export function LandingCtaButtons() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div
        className="mt-7 h-11 w-full max-w-md animate-pulse rounded-xl bg-black/[0.06] sm:mt-8"
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <>
        <div className="mt-7 flex flex-col items-center justify-center sm:mt-8">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#ffffff1a] bg-[#bd28b3ba] px-6 shadow-none sm:w-auto"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="whitespace-nowrap text-base font-medium leading-tight text-white">
                Dashboard
              </span>
              <Image
                src="/assets/icons/arrow-top.svg"
                alt=""
                className="h-4 w-4"
                width={16}
                height={16}
              />
            </span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mx-auto mt-3 max-w-2xl text-center text-base leading-[1.55em] font-normal text-black/70 sm:mt-4 sm:text-[17px] md:text-lg">
        Start Your Free Trial Today — No Credit Card Needed
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
        <Link
          href="/signup"
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#ffffff1a] bg-[#bd28b3ba] px-6 shadow-none sm:w-auto"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="whitespace-nowrap text-base font-medium leading-tight text-white">
              Start Free Trial
            </span>
            <Image
              src="/assets/icons/arrow-top.svg"
              alt=""
              className="h-4 w-4"
              width={16}
              height={16}
            />
          </span>
        </Link>
        <a
          href="#pricing"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/15 bg-white/50 px-6 text-base font-medium text-black shadow-none backdrop-blur-sm transition hover:bg-white/70 sm:w-auto"
        >
          See Plans
        </a>
      </div>
    </>
  );
}
