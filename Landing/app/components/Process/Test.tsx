"use client";
import React, { useState, useEffect } from "react";

export const Test: React.FC = () => {
  const [visibleSegments, setVisibleSegments] = useState(0);
  const [isHiding, setIsHiding] = useState(false);

  const segments = [
    { id: 1, line: 1, text: "class", color: "text-[#512FEBB3]" },
    {
      id: 2,
      line: 1,
      text: " SamplingLayers.Layer):",
      color: "text-[#ffffffB3]",
    },
    {
      id: 3,
      line: 2,
      text: '"""Uses(mean, log_var) to sample z, the vector encoding a digit.',
      color: "text-[#ffffffB3]",
    },
    { id: 4, line: 3, text: "def", color: "text-[#512FEBB3]" },
    { id: 5, line: 3, text: " call(self, inputs):", color: "text-[#ffffffB3]" },
    {
      id: 6,
      line: 4,
      text: "mean, log_var = inputs",
      color: "text-[#ffffffB3]",
    },
    {
      id: 7,
      line: 5,
      text: "batch=tf.shape(mean)[0]",
      color: "text-[#ffffffB3]",
    },
    {
      id: 8,
      line: 6,
      text: "dim=tf.shape(mean)[1]",
      color: "text-[#ffffffB3]",
    },
    {
      id: 9,
      line: 7,
      text: "return mean + tf.exp(0.5* log_var) * epsilon",
      color: "text-[#ffffffB3]",
    },
  ];

  useEffect(() => {
    if (isHiding) {
      const hideTimer = setTimeout(() => {
        setVisibleSegments(0);
        setIsHiding(false);
      }, 500);
      return () => clearTimeout(hideTimer);
    }

    const timer = setTimeout(() => {
      if (visibleSegments < segments.length) {
        setVisibleSegments(visibleSegments + 1);
      } else {
        setTimeout(() => setIsHiding(true), 300);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [visibleSegments, isHiding, segments.length]);

  const getVisibleSegmentsByLine = (lineNum: number) => {
    return segments
      .filter((seg) => seg.line === lineNum && seg.id <= visibleSegments)
      .map((seg) => seg);
  };

  const hasVisibleSegmentsInLine = (lineNum: number) => {
    return segments.some(
      (seg) => seg.line === lineNum && seg.id <= visibleSegments
    );
  };

  const isLineComplete = (lineNum: number) => {
    const lineSegments = segments.filter((seg) => seg.line === lineNum);
    return lineSegments.every((seg) => seg.id <= visibleSegments);
  };

  const lastVisibleLine = Math.max(
    ...segments
      .filter((seg) => seg.id <= visibleSegments)
      .map((seg) => seg.line)
  );

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

        <div className="px-[5px] leading-[1.7em] -tracking-[.02em] text-[10px] [#ffffffB3]">
          {!isHiding && (
            <>
              {/* Line 1 */}
              {hasVisibleSegmentsInLine(1) && (
                <p>
                  {getVisibleSegmentsByLine(1).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}

              {/* Line 2 */}
              {hasVisibleSegmentsInLine(2) && (
                <p className="ml-2 mb-4">
                  {getVisibleSegmentsByLine(2).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}

              {/* Line 3 */}
              {hasVisibleSegmentsInLine(3) && (
                <p className="ml-2">
                  {getVisibleSegmentsByLine(3).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}

              {/* Line 4 */}
              {hasVisibleSegmentsInLine(4) && (
                <p className="ml-4">
                  {getVisibleSegmentsByLine(4).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}

              {/* Line 5 */}
              {hasVisibleSegmentsInLine(5) && (
                <p className="ml-4">
                  {getVisibleSegmentsByLine(5).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}

              {/* Line 6 */}
              {hasVisibleSegmentsInLine(6) && (
                <p className="ml-4">
                  {getVisibleSegmentsByLine(6).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}

              {/* Line 7 */}
              {hasVisibleSegmentsInLine(7) && (
                <p className="ml-4">
                  {getVisibleSegmentsByLine(7).map((seg) => (
                    <span key={seg.id} className={seg.color}>
                      {seg.text}
                    </span>
                  ))}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[22px] -tracking-[.02em] font-normal leading-[1.2em] mb-2.5">
          Test
        </h3>

        <p className="text-base -tracking-[.02em] font-normal leading-[1.4em] text-[#ffffffB3]">
          We refine and validate your workflow through rigorous testing,
          ensuring reliability, accuracy, and seamless performance before
          deployment.
        </p>
      </div>
    </div>
  );
};
