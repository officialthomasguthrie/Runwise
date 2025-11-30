"use client";
import Image from "next/image";

export const Launch = () => {
  return (
    <div className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[30px] py-5 px-5 md:px-7.5 relative overflow-hidden flex flex-col gap-5 h-fit">
      <div
        className="h-[180px] w-full relative overflow-hidden rounded-lg bg-[#ffffff1f] space-y-[5px]"
        style={{
          mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.435) 27.4775%, rgb(0, 0, 0) 100%)",
        }}
      >
        <div className="h-[15px] w-full bg-[#ffffff26] px-2 flex items-center gap-[5px]">
          <div className="w-[5px] h-[5px] rounded-full bg-[#ff333380]"></div>
          <div className="w-[5px] h-[5px] rounded-full bg-[#e6ff0080]"></div>
          <div className="w-[5px] h-[5px] rounded-full bg-[#33ff4e80]"></div>
        </div>

        <div className="flex gap-[5px] px-[3px] pb-2.5 relative h-full overflow-hidden">
          <div className="bg-[#ffffff1f] h-full rounded-lg px-[5px] pt-[5px] pb-[3px] flex flex-col gap-y-[5px] flex-1">
            <div className="flex items-center gap-[7px] py-[3px] px-[5px]">
              <div className="bg-[#fff3] w-[15px] h-[15px] flex items-center justify-center rounded">
                <Image
                  src="/assets/icons/security-icon.png"
                  alt="security-icon"
                  width={13}
                  height={13}
                />
              </div>

              <p className="text-xs leading-[1.2em] -tracking-[.02em] font-light text-[#fffc]">
                Security
              </p>
            </div>

            <div className="flex items-center gap-[7px] py-[3px] px-[5px] bg-[#fff3] rounded-lg">
              <div className="bg-[#fff3] w-[15px] h-[15px] flex items-center justify-center rounded">
                <Image
                  src="/assets/icons/efficiency-icon.png"
                  alt="efficiency-icon"
                  width={13}
                  height={13}
                />
              </div>

              <p className="text-xs leading-[1.2em] -tracking-[.02em] font-light text-[#fffc]">
                Efficiency
              </p>
            </div>

            <div className="flex items-center gap-[7px] py-[3px] px-[5px]">
              <div className="bg-[#fff3] w-[15px] h-[15px] flex items-center justify-center rounded">
                <Image
                  src="/assets/icons/speed-icon.png"
                  alt="speed-icon"
                  width={13}
                  height={13}
                />
              </div>

              <p className="text-xs leading-[1.2em] -tracking-[.02em] font-light text-[#fffc]">
                Speed
              </p>
            </div>

            <div className="flex items-center gap-[7px] py-[3px] px-[5px]">
              <div className="bg-[#fff3] w-[15px] h-[15px] flex items-center justify-center rounded">
                <Image
                  src="/assets/icons/accuracy-icon.svg"
                  alt="accuracy-icon"
                  width={13}
                  height={13}
                />
              </div>

              <p className="text-xs leading-[1.2em] -tracking-[.02em] font-light text-[#fffc]">
                Accuracy
              </p>
            </div>
          </div>

          <div className="bg-[#ffffff1f] h-full rounded-lg px-[5px] pt-[5px] pb-[3px] flex flex-col gap-y-[5px] flex-1">
            <p className="text-xs leading-[1.2em] -tracking-[.02em] font-light text-[#fffc]">
              Status:
            </p>

            <div className="flex flex-col items-center gap-[5px]">
              {/* Rotating Icon */}
              <div className="animate-spin-slow">
                <Image
                  src="/assets/icons/rounded-play-circle.svg"
                  alt="rounded-play-circle"
                  width={40}
                  height={40}
                />
              </div>

              {/* Progress Bar Container */}
              <div className="bg-[#ffffff8f] rounded-lg w-[70%] h-[3px] mx-auto overflow-hidden relative">
                {/* Animated Progress Bar */}
                <div
                  className="bg-[#512febcc] rounded-lg h-[3px] absolute left-0 animate-progress"
                  style={{ width: "20px" }}
                />
              </div>
            </div>

            <p className="text-xs leading-[1.2em] -tracking-[.02em] font-light text-[#fffc] text-center">
              Updating:
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[22px] -tracking-[.02em] font-normal leading-[1.2em] mb-2.5">
          Launch
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          Your workflow is deployed with full optimization, and we monitor its
          performance to ensure smooth operation as your needs evolve.
        </p>
      </div>
    </div>
  );
};
