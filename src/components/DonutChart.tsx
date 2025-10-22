import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export type DonutChartSegment = {
  value: number;
  color: string;
};

export type DonutChartProps = {
  segments: DonutChartSegment[];
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  backgroundColor: string;
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

export const DonutChart = ({
  segments,
  size = 160,
  strokeWidth = 18,
  trackColor,
  backgroundColor,
}: DonutChartProps) => {
  const normalizedSegments = segments
    .map((segment) => ({
      value: Math.max(0, segment.value),
      color: segment.color,
    }))
    .filter((segment) => segment.value > 0);

  const totalValue = normalizedSegments.reduce((total, segment) => total + segment.value, 0);
  const radius = Math.max((size - strokeWidth) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const arcs: React.ReactNode[] = [];

  if (totalValue > 0 && circumference > 0) {
    let currentOffset = 0;
    normalizedSegments.forEach((segment, index) => {
      const segmentLength = (segment.value / totalValue) * circumference;
      const isFullCircle = segmentLength >= circumference - 0.5;
      const dashArray = isFullCircle ? undefined : `${Math.max(segmentLength, 0.5)} ${circumference}`;
      arcs.push(
        <Circle
          key={`${segment.color}-${index}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={isFullCircle ? 0 : currentOffset}
          strokeLinecap="round"
          fill="transparent"
        />,
      );
      currentOffset -= segmentLength;
    });
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {arcs}
        </G>
      </Svg>
    </View>
  );
};
