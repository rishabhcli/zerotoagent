import React from "react";
import { Composition } from "remotion";
import generatedScenes from "./generated-scene-data.json";
import { ReProAppWalkthrough, type DemoScene } from "./ReProAppWalkthrough";

const FPS = 30;

const scenes = generatedScenes as DemoScene[];
const durationInFrames = scenes.reduce(
  (total, scene) => total + scene.durationInFrames,
  0
);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ReProAppWalkthrough"
      component={ReProAppWalkthrough}
      durationInFrames={durationInFrames}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ scenes }}
    />
  );
};
