/* 空间参数集中在这里；场景、物件状态和动画继续由原 index.html 驱动。 */
window.CABIN_DESIGN = Object.freeze({
  palette: Object.freeze({ paper: 0xf5f5f3, wall: 0xf0f0ed, roof: 0x363735, floor: 0xe5e5e1, ink: 0x30322f, detail: 0xa5a7a1 }),
  shelf: Object.freeze({ x: 3.52, z: 1.30, width: 1.30, depth: .38 }),
  bed: Object.freeze({ x: -2.55, z: -2.45 }),
  camera: Object.freeze({ look: [0, 2.5, 0], yaw: Math.atan2(11, -14), pitch: .47, distance: 21.5, fov: 42 })
});
