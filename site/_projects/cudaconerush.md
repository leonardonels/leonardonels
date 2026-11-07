---
name: cuCONERUSH
tag: CUDA × ROS 2
color: "#FF6B6B"
description: "Turns a LiDAR point cloud into cone markers without ever leaving the GPU, because asking the CPU to help would be embarrassing. A leisurely 10 ms on an Orin Nano Super, a borderline-rude 1.1 ms on an RTX 4060 Mobile."
link: https://github.com/leonardonels/cuda_cone_rush
order: 1
flight: LN 002
route: [PCL, Cones]
stub: { label: Flight time, value: 1.1 ms, note: "4060M · 10 ms Orin", accent: true }
---