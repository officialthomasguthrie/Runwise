"use client";
import Image from "next/image";

export const LeadGeneration = () => {
  return (
    <div className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[10px] py-5 px-5 md:px-7.5 relative overflow-hidden flex flex-col gap-5 h-fit">
      <div className="h-[280px] w-full relative overflow-hidden pt-2.5">
        <div
          className="flex flex-col gap-[5px] w-full h-full"
          style={{
            mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.435) 46.6967%, rgb(0, 0, 0) 100%)",
          }}
        >
          <div className="bg-[#ffffff1f] rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="bg-[#ffffff1f] rounded-full h-[35px] w-[35px] flex items-center justify-center">
              <Image
                src="/assets/icons/user-icon.png"
                alt="User icon"
                width={24}
                height={24}
              />
            </div>

            <div className="flex flex-col gap-y-[3px] flex-1">
              <p className="text-sm font-normal leading-[1.2em]">Jack Daniel</p>
              <p className="text-xs font-light leading-[1.2em]">Founder</p>
            </div>

            <Image
              src="/assets/icons/down_arrow.png"
              alt="down-arrow icon"
              width={24}
              height={24}
            />
          </div>

          <div className="bg-[#ffffff1f] rounded-lg p-2.5 space-y-2.5 h-full min-h-full">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#ffffff1f] rounded-full h-[35px] w-[35px] flex items-center justify-center">
                <Image
                  src="/assets/icons/user-icon.png"
                  alt="User icon"
                  width={24}
                  height={24}
                />
              </div>

              <div className="flex flex-col gap-y-[3px] flex-1">
                <p className="text-sm font-normal leading-[1.2em]">
                  Justin Rocks
                </p>
                <p className="text-xs font-light leading-[1.2em]">
                  Marketing head
                </p>
              </div>

              <Image
                src="/assets/icons/down_arrow.png"
                alt="down-arrow icon"
                width={24}
                height={24}
                className="rotate-180"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-[#ffffffb3] text-xs font-light -tracking-[.02em] leading-[1.2em] pb-2">
                <p>E-mail</p>
                <p>justin@main.com</p>
              </div>

              <div className="text-[#ffffffb3] text-xs font-light -tracking-[.02em] leading-[1.2em] pb-2">
                <p>Phone</p>
                <p>+1(812)98XXX</p>
              </div>

              <div className="text-[#ffffffb3] text-xs font-light -tracking-[.02em] leading-[1.2em]">
                <p>Company</p>
                <p>XYZ LLC</p>
              </div>

              <div className="text-[#ffffffb3] text-xs font-light -tracking-[.02em] leading-[1.2em]">
                <p>Verified</p>
                <p>Yes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-40 w-full">
          <div className="max-w-[140px] w-full mx-auto">
            <div className="mx-auto relative">
              {/* Animated Rotating Glow */}
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div
                  className="absolute -inset-[2px]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0%, rgba(81, 47, 235, 0.8) 10%, rgba(139, 92, 246, 0.6) 20%, transparent 30%, transparent 100%)",
                    animation: "spin-two 8s linear infinite",
                  }}
                />
              </div>

              {/* Wrapper height set to 36.8px */}
              <div className="relative bg-[#ffffff0d] rounded-lg p-0.5 h-[36.8px]">
                <div className="bg-[#313131] rounded-lg h-full px-5 flex items-center justify-between w-full">
                  <p className="text-sm font-normal whitespace-nowrap text-[#ffffffe6]">
                    Generate Leads
                  </p>
                </div>
              </div>

              {/* Ambient Glow Behind */}
              <div
                className="absolute inset-0 -z-10 blur-[50px] opacity-30"
                style={{
                  background:
                    "radial-gradient(50% 50% at 50% 50%, rgba(81, 47, 235, 0.6) 0%, rgba(255, 255, 255, 0) 100%)",
                }}
              />
            </div>

            <style jsx>{`
              @keyframes spin-two {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
            `}</style>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[22px] -tracking-[.02em] font-normal leading-[1.2em] mb-2.5">
          Lead Generation
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          Identify, score, and enrich leads automatically to streamline outreach
          and boost overall sales efficiency.
        </p>
      </div>
    </div>
  );
};
