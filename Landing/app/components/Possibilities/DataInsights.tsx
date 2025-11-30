"use client";

export const DataInsights = () => {
  return (
    <div className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[10px] py-5 px-5 md:px-7.5 space-y-5">
      <div
        className="flex gap-2.5 md:p-2.5"
        style={{
          mask: "linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 17.1171%, rgb(0, 0, 0) 100%)",
        }}
      >
        <div className="flex-1 bg-[#ffffff1f] rounded-lg p-[5px] h-[207px] flex flex-col gap-[5px] data-insights-box max-[1200px]:hidden">
          <p className="py-[5px] px-2 text-xs -tracking-[.02em] font-normal leading-[1.2em]">
            Filters :
          </p>

          <div className="py-[5px] px-2 bg-[#fff3] rounded-lg text-xs font-light -tracking-[.02em] leading-[1.2em]">
            Work Efficiency
          </div>

          <div className="py-[5px] px-2 bg-transparent rounded-lg text-xs font-light -tracking-[.02em] leading-[1.2em]">
            Cost Reduction
          </div>

          <div className="py-[5px] px-2 bg-transparent rounded-lg text-xs font-light -tracking-[.02em] leading-[1.2em]">
            Automated Tasks
          </div>

          <div className="py-[5px] px-2 bg-transparent rounded-lg text-xs font-light -tracking-[.02em] leading-[1.2em]">
            Lead Nurturing
          </div>
        </div>

        <div className="flex-2 bg-[#ffffff1f] rounded-lg py-[15px] px-2.5 h-[207px] flex flex-col gap-[15px] data-insights-box">
          <div className="flex justify-between items-center">
            <p className="text-sm font-normal leading-[1.2em]">
              Work Efficiency
            </p>
            <p className="text-sm font-normal leading-[1.2em]">+23%</p>
          </div>

          <div className="flex gap-2.5 relative overflow-hidden px-2.5">
            <div className="bg-[#ffffff80] w-px h-[107px] flex flex-col items-center place-content-center gap-[15px] relative">
              <div className="bg-[#ffffff80] h-px w-2"></div>
              <div className="bg-[#ffffff80] h-px w-2"></div>
              <div className="bg-[#ffffff80] h-px w-2"></div>
              <div className="bg-[#ffffff80] h-px w-2"></div>
              <div className="bg-[#ffffff80] h-px w-2"></div>
              <div className="bg-[#ffffff80] h-px w-2"></div>
            </div>

            <div className="flex-1 flex flex-col self-stretch items-start justify-end pt-2.5 px-[5px] gap-2.5">
              <div className="h-[70%] w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="100%"
                  height="100%"
                  viewBox="0 0 192 41"
                >
                  <style>
                    {`
      @keyframes drawLine {
        0% { stroke-dashoffset: 1; }
        80% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 0; }
      }
      .animated-path {
        animation: drawLine 5s ease-in-out infinite;
      }
    `}
                  </style>
                  <path
                    className="animated-path"
                    d="M 0.5 40 L 19 21.5 L 29.5 31 L 53.5 17.5 L 73.5 37.5 L 97 17.5 C 97 17.5 114.041 24.541 114.5 25 C 114.959 25.459 145 9 145 9 C 145 9 166 22.343 166 21.5 C 166 20.657 191.5 0.5 191.5 0.5"
                    stroke="rgba(81, 47, 235, 0.7)"
                    strokeWidth="1"
                    fill="transparent"
                    pathLength="1"
                    strokeDasharray="1"
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between max-w-[1200px]:justify-start w-full gap-2.5 text-[#ffffffcc] text-[6px] -tracking-[0.02em] font-light">
                <p>Day 1</p>
                <p>Day 2</p>
                <p>Day 3</p>
                <p>Day 4</p>
                <p>Day 5</p>
                <p>Day 6</p>
                <p>Day 7</p>
              </div>
            </div>
          </div>

          <p className="text-[#ffffffb3] text-[10px] font-light -tracking-[.04em] leading-[1.2em] text-center">
            Work efficiency in this week increased to 23% as compared to last
            week.
          </p>
        </div>

        <div className="flex-1 bg-[#ffffff1f] rounded-lg p-[5px] h-[207px] flex flex-col gap-2 data-insights-box max-[1200px]:hidden">
          <p className="py-[5px] px-2 text-xs -tracking-[.02em] font-normal leading-[1.2em]">
            Overall :
          </p>

          <p className="text-lg text-center text-[#ffffffb3]">
            <span className="text-[25px]">48.9</span>%
          </p>

          <div>
            <div className="w-[73%] h-[3px] mx-auto rounded-[5px] bg-[#ffffff40] overflow-hidden relative">
              <div
                className="h-full bg-[#512febcc] rounded-[5px] animate-progress"
                style={{ width: "48.9%" }}
              />
            </div>

            <style jsx>{`
              @keyframes progress {
                0% {
                  transform: translateX(-100%);
                }
                70% {
                  transform: translateX(0%);
                }
                100% {
                  transform: translateX(0%);
                }
              }

              .animate-progress {
                animation: progress 5s ease-out infinite;
              }
            `}</style>
          </div>

          <p className="py-[5px] px-1 text-[10px] -tracking-[-.04em] leading-[1.2em] font-light text-[#ffffffb3]">
            Overall now you have 48.9% better system as compared to previous
            week
          </p>

          <button className="bg-[#ffffff0d] rounded-lg p-px font-light text-sm max-w-[82px] mx-auto w-full h-[36.8px] relative overflow-hidden">
            {/* Animated Glow Layer - Larger for better visibility */}
            <div
              className="absolute inset-[-50%] animate-glow-move"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(81, 47, 235, 0.9) 0%, rgba(139, 92, 246, 0.6) 30%, rgba(255, 255, 255, 0) 60%)",
              }}
            />

            {/* Content Layer */}
            <div className="bg-[#313131] rounded-lg w-full h-full flex items-center justify-center relative z-10">
              Export
            </div>

            <style jsx>{`
              @keyframes glow-move {
                0% {
                  transform: translate(0%, 0%);
                }
                25% {
                  transform: translate(-30%, 30%);
                }
                50% {
                  transform: translate(-15%, -20%);
                }
                75% {
                  transform: translate(20%, 15%);
                }
                100% {
                  transform: translate(0%, 0%);
                }
              }

              .animate-glow-move {
                animation: glow-move 6s ease-in-out infinite;
              }
            `}</style>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[22px] -tracking-[.02em] font-normal leading-[1.2em] mb-2.5">
          Data Insights
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          Turn complex datasets into clear insights, visual trends, and helpful
          metrics for smarter decisions.
        </p>
      </div>
    </div>
  );
};
