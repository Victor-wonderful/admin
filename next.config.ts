import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 컨테이너 브라우저/네트워크 IP 로 dev 접근 시 cross-origin 자산 차단 방지.
  allowedDevOrigins: ["10.8.1.2", "host.docker.internal"],
};

export default nextConfig;
