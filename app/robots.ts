import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildRobots } from "@/lib/seo/robots";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(getSiteUrl(), { blockAll: process.env.VERCEL_ENV === "preview" });
}
