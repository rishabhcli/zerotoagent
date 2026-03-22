import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface DemoScene {
  id: string;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  screenshot: string | null;
  audioSrc: string;
  durationInFrames: number;
  accentFrom: string;
  accentTo: string;
}

const fps = 30;
const narrationPlaybackRate = 1.32;

const frameShadow =
  "0 45px 120px rgba(2, 6, 23, 0.58), 0 14px 42px rgba(15, 23, 42, 0.46)";

const surfaceStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.88))",
  boxShadow: frameShadow,
  backdropFilter: "blur(22px)",
};

const Pill: React.FC<{ label: string; index: number }> = ({ label, index }) => {
  const frame = useCurrentFrame();
  const enter = spring({
    frame: frame - index * 4,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  return (
    <div
      style={{
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        opacity: enter,
        borderRadius: 999,
        padding: "12px 18px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(226,232,240,0.94)",
        fontSize: 20,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
};

const AnimatedBackdrop: React.FC<{
  accentFrom: string;
  accentTo: string;
}> = ({ accentFrom, accentTo }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 240], [0, 1], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at top, rgba(12,18,37,0.96), rgba(2,6,23,1) 58%)",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate3d(${Math.sin(drift * 1.7) * 80}px, ${
            Math.cos(drift * 1.3) * 30
          }px, 0)`,
          background: `
            radial-gradient(circle at 18% 24%, ${accentFrom}44, transparent 30%),
            radial-gradient(circle at 78% 12%, ${accentTo}30, transparent 28%),
            radial-gradient(circle at 74% 84%, rgba(255,255,255,0.07), transparent 26%)
          `,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.1,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          transform: `translateY(${interpolate(
            Math.sin(frame / 40),
            [-1, 1],
            [-12, 12]
          )}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 22%, transparent 78%, rgba(255,255,255,0.02))",
        }}
      />
    </AbsoluteFill>
  );
};

const SceneChrome: React.FC<{
  scene: DemoScene;
  index: number;
  total: number;
  children: React.ReactNode;
}> = ({ scene, index, total, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AnimatedBackdrop
        accentFrom={scene.accentFrom}
        accentTo={scene.accentTo}
      />
      {children}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "rgba(226,232,240,0.8)",
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span
            style={{
              width: 84,
              height: 1,
              background: "rgba(255,255,255,0.25)",
            }}
          />
          <span>{scene.kicker}</span>
        </div>
        <div
          style={{
            width: 420,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${scene.accentFrom}, ${scene.accentTo})`,
            }}
          />
        </div>
        <div
          style={{
            color: "rgba(226,232,240,0.6)",
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {String(total).padStart(2, "0")}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScreenshotScene: React.FC<{
  scene: DemoScene;
  index: number;
  total: number;
}> = ({ scene, index, total }) => {
  const frame = useCurrentFrame();
  const enter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 110 },
  });
  const screenshotDrift = interpolate(frame, [0, 180], [48, -20], {
    extrapolateRight: "clamp",
  });
  const textTranslate = interpolate(enter, [0, 1], [70, 0]);
  const screenshotScale = interpolate(enter, [0, 1], [1.08, 1]);
  const isReversed = index % 2 === 1;

  const screenshot = scene.screenshot
    ? staticFile(`demo-video/shots/${scene.screenshot}`)
    : null;

  return (
    <SceneChrome scene={scene} index={index} total={total}>
      <div
        style={{
          position: "absolute",
          inset: "68px 72px 110px",
          display: "grid",
          gridTemplateColumns: isReversed ? "1.1fr 0.9fr" : "0.9fr 1.1fr",
          gap: 46,
          alignItems: "center",
        }}
      >
        <div
          style={{
            order: isReversed ? 2 : 1,
            transform: `translateY(${textTranslate}px)`,
            opacity: enter,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(186,230,253,0.92)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {scene.kicker}
          </div>
          <h1
            style={{
              marginTop: 28,
              marginBottom: 0,
              color: "white",
              fontSize: 78,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              maxWidth: 700,
            }}
          >
            {scene.title}
          </h1>
          <p
            style={{
              marginTop: 24,
              marginBottom: 0,
              color: "rgba(226,232,240,0.78)",
              fontSize: 28,
              lineHeight: 1.45,
              maxWidth: 700,
            }}
          >
            {scene.body}
          </p>
          <div
            style={{
              marginTop: 30,
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              maxWidth: 720,
            }}
          >
            {scene.bullets.map((bullet, bulletIndex) => (
              <Pill key={bullet} label={bullet} index={bulletIndex} />
            ))}
          </div>
        </div>

        <div
          style={{
            order: isReversed ? 1 : 2,
            display: "flex",
            justifyContent: isReversed ? "flex-start" : "flex-end",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 1040,
              borderRadius: 34,
              padding: 20,
              ...surfaceStyle,
              transform: `perspective(2200px) rotateY(${
                isReversed ? 9 : -9
              }deg) translateY(${screenshotDrift}px) scale(${screenshotScale})`,
              transformOrigin: isReversed ? "left center" : "right center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 34,
                background: `linear-gradient(135deg, ${scene.accentFrom}22, transparent 32%, ${scene.accentTo}18)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -14,
                right: 28,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(2,6,23,0.78)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(226,232,240,0.84)",
                fontSize: 16,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Real Capture
            </div>
            {screenshot ? (
              <Img
                src={screenshot}
                style={{
                  width: "100%",
                  borderRadius: 22,
                  display: "block",
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </SceneChrome>
  );
};

const FinalScene: React.FC<{ scene: DemoScene; index: number; total: number }> = ({
  scene,
  index,
  total,
}) => {
  const frame = useCurrentFrame();
  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 110 },
  });
  const montage = [
    "dashboard.png",
    "run-live.png",
    "admin.png",
    "voice.png",
  ];

  return (
    <SceneChrome scene={scene} index={index} total={total}>
      <div
        style={{
          position: "absolute",
          inset: "76px 72px 126px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 44,
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: `translateY(${interpolate(enter, [0, 1], [56, 0])}px)`,
            opacity: enter,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(165,243,252,0.92)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {scene.kicker}
          </div>
          <h1
            style={{
              marginTop: 28,
              marginBottom: 0,
              color: "white",
              fontSize: 88,
              lineHeight: 1.01,
              fontWeight: 700,
              letterSpacing: "-0.06em",
              maxWidth: 760,
            }}
          >
            {scene.title}
          </h1>
          <p
            style={{
              marginTop: 22,
              marginBottom: 0,
              color: "rgba(226,232,240,0.78)",
              fontSize: 30,
              lineHeight: 1.44,
              maxWidth: 720,
            }}
          >
            {scene.body}
          </p>
          <div
            style={{
              marginTop: 30,
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              maxWidth: 720,
            }}
          >
            {scene.bullets.map((bullet, bulletIndex) => (
              <Pill key={bullet} label={bullet} index={bulletIndex} />
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            height: 760,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {montage.map((file, montageIndex) => {
            const local = spring({
              frame: frame - montageIndex * 5,
              fps,
              config: { damping: 20, stiffness: 100 },
            });

            return (
              <div
                key={file}
                style={{
                  ...surfaceStyle,
                  borderRadius: 30,
                  padding: 16,
                  transform: `translateY(${interpolate(local, [0, 1], [48, 0])}px) rotate(${
                    montageIndex % 2 === 0 ? -4 : 4
                  }deg) scale(${interpolate(local, [0, 1], [0.92, 1])})`,
                  opacity: local,
                }}
              >
                <Img
                  src={staticFile(`demo-video/shots/${file}`)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 18,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </SceneChrome>
  );
};

export const ReProAppWalkthrough: React.FC<{ scenes: DemoScene[] }> = ({
  scenes,
}) => {
  const sceneStarts = scenes.map((scene, index) => {
    return scenes
      .slice(0, index)
      .reduce((sum, priorScene) => sum + priorScene.durationInFrames, 0);
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#020617" }}>
      {scenes.map((scene, index) => {
        return (
          <Sequence
            key={scene.id}
            from={sceneStarts[index] ?? 0}
            durationInFrames={scene.durationInFrames}
          >
            <Audio
              src={staticFile(scene.audioSrc)}
              playbackRate={narrationPlaybackRate}
            />
            {scene.id === "finale" ? (
              <FinalScene scene={scene} index={index} total={scenes.length} />
            ) : (
              <ScreenshotScene
                scene={scene}
                index={index}
                total={scenes.length}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
