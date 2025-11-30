"use client";

import Image from "next/image";

export const AIConsulting = () => {
  return (
    <div className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[10px] py-5 px-5 md:px-7.5 space-y-5">
      <div
        className="flex gap-2.5 md:p-2.5"
        style={{
          mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 17.1171%, rgb(0, 0, 0) 100%)",
        }}
      >
        <div className="flex-1 bg-[#ffffff1f] rounded-lg p-[5px] h-[207px] flex flex-col gap-[5px] data-insights-box max-[1200px]:hidden">
          <div className="py-[5px] px-2 flex items-center gap-2.5">
            <div className="bg-[#67ff01] w-2 h-2 rounded-full"></div>
            <p className="text-xs font-light leading-[1.2em] -tracking-[.02em]">
              On Call..
            </p>
          </div>

          <div className="py-[5px] px-2 rounded-lg bg-transparent flex items-center gap-[7px]">
            <div className="w-[15px] h-[15px] bg-[#fff3] rounded flex items-center justify-center">
              <Image
                src="/assets/icons/mic-icon.png"
                alt="mic-icon"
                width={13}
                height={13}
              />
            </div>

            <p className="text-[#ffffffcc] text-xs leading-[1.2em] font-light -tracking-[.02em]">
              Mic On
            </p>
          </div>

          <div className="py-[5px] px-2 rounded-lg bg-[#fff3] flex items-center gap-[7px]">
            <div className="w-[15px] h-[15px] bg-[#fff3] rounded flex items-center justify-center">
              <Image
                src="/assets/icons/video-icon.png"
                alt="video-icon"
                width={13}
                height={13}
              />
            </div>

            <p className="text-[#ffffffcc] text-xs leading-[1.2em] font-light -tracking-[.02em]">
              Video Off
            </p>
          </div>

          <div className="py-[5px] px-2 rounded-lg bg-transparent flex items-center gap-[7px]">
            <div className="w-[15px] h-[15px] bg-[#fff3] rounded flex items-center justify-center">
              <Image
                src="/assets/icons/caption-icon.png"
                alt="caption-icon"
                width={13}
                height={13}
              />
            </div>

            <p className="text-[#ffffffcc] text-xs leading-[1.2em] font-light -tracking-[.02em]">
              Caption On
            </p>
          </div>

          <div className="py-[5px] px-2 rounded-lg bg-transparent flex items-center gap-[7px]">
            <div className="w-[15px] h-[15px] bg-[#fff3] rounded flex items-center justify-center">
              <Image
                src="/assets/icons/present-icon.png"
                alt="present-icon"
                width={13}
                height={13}
              />
            </div>

            <p className="text-[#ffffffcc] text-xs leading-[1.2em] font-light -tracking-[.02em]">
              Present
            </p>
          </div>

          <div className="px-[5px]">
            <div className="py-0.5 px-2.5 bg-[#ff033ecc] rounded-lg flex items-center justify-center">
              <Image
                src="/assets/icons/call-cancel-icon.png"
                alt="call-cancel-icon"
                width={20}
                height={20}
              />
            </div>
          </div>
        </div>

        <div className="flex-2 bg-[#ffffff1f] rounded-lg py-[15px] px-2.5 h-[207px] grid grid-cols-2 gap-2.5 data-insights-box">
          <div className="bg-[#ffffff26] rounded-lg flex flex-col justify-center items-center gap-2.5 h-full">
            <div className="flex items-center justify-center gap-0.5 h-10 w-10">
              <style jsx>{`
                @keyframes voice1 {
                  0%,
                  100% {
                    height: 8px;
                  }
                  50% {
                    height: 28px;
                  }
                }
                @keyframes voice2 {
                  0%,
                  100% {
                    height: 12px;
                  }
                  50% {
                    height: 32px;
                  }
                }
                @keyframes voice3 {
                  0%,
                  100% {
                    height: 16px;
                  }
                  50% {
                    height: 36px;
                  }
                }
                @keyframes voice4 {
                  0%,
                  100% {
                    height: 14px;
                  }
                  50% {
                    height: 34px;
                  }
                }
                @keyframes voice5 {
                  0%,
                  100% {
                    height: 10px;
                  }
                  50% {
                    height: 38px;
                  }
                }
                @keyframes voice6 {
                  0%,
                  100% {
                    height: 8px;
                  }
                  50% {
                    height: 30px;
                  }
                }
                .bar1 {
                  animation: voice1 0.6s ease-in-out infinite;
                }
                .bar2 {
                  animation: voice2 0.7s ease-in-out infinite 0.1s;
                }
                .bar3 {
                  animation: voice3 0.65s ease-in-out infinite 0.2s;
                }
                .bar4 {
                  animation: voice4 0.68s ease-in-out infinite 0.15s;
                }
                .bar5 {
                  animation: voice5 0.62s ease-in-out infinite 0.25s;
                }
                .bar6 {
                  animation: voice6 0.72s ease-in-out infinite 0.05s;
                }
              `}</style>

              {/* Bar 1 */}
              <div className="bar1 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 2 */}
              <div className="bar2 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 3 */}
              <div className="bar3 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 4 */}
              <div className="bar4 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 5 */}
              <div className="bar5 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 6 */}
              <div className="bar6 w-0.5 bg-[#512febcc] rounded-full"></div>
            </div>

            <p className="text-[10px] text-center text-[#ffffffb3] font-light -tracking-[.04em] leading-[1.2em]">
              AI Developer
            </p>
          </div>

          <div className="bg-[#ffffff26] rounded-lg flex flex-col justify-center items-center gap-2.5 h-full">
            <Image
              src="/assets/icons/user-circle-icon.png"
              alt="user-circle-icon"
              width={40}
              height={40}
            />

            <p className="text-[10px] text-center text-[#ffffffb3] font-light -tracking-[.04em] leading-[1.2em]">
              AI Developer
            </p>
          </div>

          <div className="bg-[#ffffff26] rounded-lg flex flex-col justify-center items-center gap-2.5 h-full">
            <Image
              src="/assets/icons/user-circle-icon.png"
              alt="user-circle-icon"
              width={40}
              height={40}
            />

            <p className="text-[10px] text-center text-[#ffffffb3] font-light -tracking-[.04em] leading-[1.2em]">
              AI Developer
            </p>
          </div>

          <div className="bg-[#ffffff26] rounded-lg flex flex-col justify-center items-center gap-2.5 h-full">
            <div className="flex items-center justify-center gap-0.5 h-10 w-10">
              <style jsx>{`
                @keyframes voice1 {
                  0%,
                  100% {
                    height: 8px;
                  }
                  50% {
                    height: 28px;
                  }
                }
                @keyframes voice2 {
                  0%,
                  100% {
                    height: 12px;
                  }
                  50% {
                    height: 32px;
                  }
                }
                @keyframes voice3 {
                  0%,
                  100% {
                    height: 16px;
                  }
                  50% {
                    height: 36px;
                  }
                }
                @keyframes voice4 {
                  0%,
                  100% {
                    height: 14px;
                  }
                  50% {
                    height: 34px;
                  }
                }
                @keyframes voice5 {
                  0%,
                  100% {
                    height: 10px;
                  }
                  50% {
                    height: 38px;
                  }
                }
                @keyframes voice6 {
                  0%,
                  100% {
                    height: 8px;
                  }
                  50% {
                    height: 30px;
                  }
                }
                .bar1 {
                  animation: voice1 0.6s ease-in-out infinite;
                }
                .bar2 {
                  animation: voice2 0.7s ease-in-out infinite 0.1s;
                }
                .bar3 {
                  animation: voice3 0.65s ease-in-out infinite 0.2s;
                }
                .bar4 {
                  animation: voice4 0.68s ease-in-out infinite 0.15s;
                }
                .bar5 {
                  animation: voice5 0.62s ease-in-out infinite 0.25s;
                }
                .bar6 {
                  animation: voice6 0.72s ease-in-out infinite 0.05s;
                }
              `}</style>

              {/* Bar 1 */}
              <div className="bar1 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 2 */}
              <div className="bar2 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 3 */}
              <div className="bar3 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 4 */}
              <div className="bar4 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 5 */}
              <div className="bar5 w-0.5 bg-[#512febcc] rounded-full"></div>

              {/* Bar 6 */}
              <div className="bar6 w-0.5 bg-[#512febcc] rounded-full"></div>
            </div>

            <p className="text-[10px] text-center text-[#ffffffb3] font-light -tracking-[.04em] leading-[1.2em]">
              AI Developer
            </p>
          </div>
        </div>

        <div className="flex-1 bg-[#ffffff1f] rounded-lg p-[5px] h-[207px] flex flex-col gap-2.5 data-insights-box max-[1200px]:hidden">
          <p className="py-[5px] px-2 text-xs -tracking-[.02em] font-normal leading-[1.2em]">
            Note Taking…
          </p>

          <div className="flex flex-col gap-2.5 px-2">
            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-3 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>

            <div className="w-full h-0.5 grid grid-cols-2 gap-0.5">
              <div className="rounded-[2px] bg-[#fff3]"></div>
              <div className="rounded-[2px] bg-[#fff3]"></div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[22px] -tracking-[.02em] font-normal leading-[1.2em] mb-2.5">
          AI Consulting
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          Work with AI experts to design tailored solutions that enhance
          operations, strategy, and daily workflow.
        </p>
      </div>
    </div>
  );
};
