"use client";
import Image from "next/image";

export const ContentCreation = () => {
  return (
    <div className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[10px] py-5 px-5 md:px-7.5 relative overflow-hidden flex flex-col gap-5 h-fit">
      <div className="h-[280px] w-full relative overflow-hidden rounded-lg flex items-start pt-2.5 justify-start">
        <div
          className="flex flex-col gap-y-2.5 w-full"
          style={{
            mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.435) 27.4775%, rgb(0, 0, 0) 100%)",
          }}
        >
          {/* Search bar  */}
          <div className="bg-[#ffffff1f] rounded-lg p-2.5 flex items-center gap-2.5 w-full">
            <div className="w-[25px] h-[25px] bg-[#ffffff1f] rounded flex items-center justify-center">
              <Image
                src="/assets/icons/search-icon.svg"
                alt="search-icon"
                width={15}
                height={15}
              />
            </div>

            <p className="text-sm leading-[1.2em] font-normal">
              Generate content..
            </p>
          </div>

          <div className="max-w-[100px] w-full mx-auto">
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
                  <p className="text-sm font-normal">Generate</p>
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

          <div className="grid grid-cols-3 gap-[5px]">
            <div className="bg-[#ffffff1f] rounded-lg py-2 flex flex-col gap-2.5">
              <div className="px-2.5 flex items-center gap-2.5 w-full">
                <div className="bg-[#ffffff1f] rounded-md w-[25px] h-[25px] flex items-center justify-center">
                  <Image
                    src="/assets/icons/linkedn-icon.svg"
                    alt="linkedn-icon"
                    width={15}
                    height={15}
                  />
                </div>

                <div className="flex flex-col flex-1 w-full gap-y-[7px]">
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                </div>
              </div>

              <div className="px-2 flex flex-col gap-2.5 w-full">
                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>
              </div>
            </div>

            <div className="bg-[#ffffff1f] rounded-lg py-2 flex flex-col gap-2.5">
              <div className="px-2.5 flex items-center gap-2.5 w-full">
                <div className="bg-[#ffffff1f] rounded-md w-[25px] h-[25px] flex items-center justify-center">
                  <Image
                    src="/assets/icons/x.svg"
                    alt="x-icon"
                    width={15}
                    height={15}
                  />
                </div>

                <div className="flex flex-col flex-1 w-full gap-y-[7px]">
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                </div>
              </div>

              <div className="px-2 flex flex-col gap-2.5 w-full">
                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>
              </div>
            </div>

            <div className="bg-[#ffffff1f] rounded-lg py-2 flex flex-col gap-2.5">
              <div className="px-2.5 flex items-center gap-2.5 w-full">
                <div className="bg-[#ffffff1f] rounded-md w-[25px] h-[25px] flex items-center justify-center">
                  <Image
                    src="/assets/icons/globe-icon.png"
                    alt="globe-icon"
                    width={15}
                    height={15}
                  />
                </div>

                <div className="flex flex-col flex-1 w-full gap-y-[7px]">
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                  <div className="bg-[#fff3] h-0.5 w-full"></div>
                </div>
              </div>

              <div className="px-2 flex flex-col gap-2.5 w-full">
                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>

                <div className="grid grid-cols-3 gap-0.5">
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                  <div className="bg-[#fff3] h-0.5 rounded-[2px]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[22px] -tracking-[.02em] font-normal leading-[1.2em] mb-2.5">
          Content Creation
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          Generate polished content instantly with AI that keeps messaging
          consistent, clear, and tailored to users.
        </p>
      </div>
    </div>
  );
};
