"use client"
import Image from "next/image";

export const Prompt = () => {
  return (
    <div className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[30px] py-5 px-5 md:px-7.5 relative overflow-hidden flex flex-col gap-5 h-fit">
      <div
        className="h-[180px] w-full relative overflow-hidden rounded-lg bg-[#ffffff1f]"
        style={{
          mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.435) 27.4775%, rgb(0, 0, 0) 100%)",
        }}
      >
        <div className="pb-2.5 px-2.5 w-[265px] mx-auto">
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[265px]"
            style={{
              mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.435) 46.6967%, rgb(0, 0, 0) 100%)",
            }}
          >
            <div className="p-2.5 flex gap-2.5 mx-auto z-10">
              <div className="bg-[#ffffff1f] rounded-lg flex flex-col items-end gap-2.5 p-2.5 w-full flex-1">
                <div className="bg-[#fffc] rounded-[2px] h-1 w-[55px]"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
              </div>

              <div className="bg-[#ffffff1f] border border-[#ffffff1a] rounded-md w-7.5 h-7.5"></div>
            </div>

            <div className="p-2.5 flex gap-2.5 mx-auto z-10">
              <div className="bg-[#ffffff1f] rounded-lg flex flex-col items-end gap-2.5 p-2.5 w-full flex-1">
                <div className="bg-[#fffc] rounded-[2px] h-1 w-[55px]"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
              </div>

              <div className="bg-[#ffffff1f] border border-[#ffffff1a] rounded-md w-7.5 h-7.5"></div>
            </div>

            <div className="p-2.5 flex gap-2.5 mx-auto z-10">
              <div className="bg-[#ffffff1f] border border-[#ffffff1a] rounded-md w-7.5 h-7.5"></div>

              <div className="bg-[#ffffff1f] rounded-lg flex flex-col items-start gap-2.5 p-2.5 w-full flex-1">
                <div className="bg-[#fffc] rounded-[2px] h-1 w-[55px]"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
                <div className="bg-[#fff3] rounded-[2px] h-[3px] w-full"></div>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-40 w-[83%]">
            <div className="w-[90%] mx-auto relative">
              {/* Animated Rotating Glow */}
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-[-2px]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0%, rgba(81, 47, 235, 0.8) 10%, rgba(139, 92, 246, 0.6) 20%, transparent 30%, transparent 100%)",
                    animation: "spin 4s linear infinite",
                  }}
                />
              </div>

              {/* Search Bar */}
              <div className="relative bg-[#ffffff0d] rounded-lg p-0.5">
                <div className="bg-[#313131] rounded-lg py-2.5 px-5 flex items-center justify-between w-full">
                  <p className="text-[#fffc] text-sm font-light">
                    Ask me something..
                  </p>

                  <div className="bg-[#ffffff1f] rounded w-[25px] h-[25px] flex items-center justify-center">
                    <Image
                      src="/assets/icons/share-icon.svg"
                      alt="share-icon"
                      width={15}
                      height={15}
                    />
                  </div>
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
              @keyframes spin {
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
          Prompt
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          Describe your process in plain English, and our AI instantly converts
          it into a structured, ready-to-build workflow tailored to your needs.
        </p>
      </div>
    </div>
  );
};
