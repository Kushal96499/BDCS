// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Convex File Storage Backend
// ============================================
// This module provides pure storage utilities.
// All access control is handled by Firebase / Firestore.
// No business logic lives here.

import { mutation, query, httpAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a short-lived upload URL for direct client-side file upload.
 * The client POSTs the raw file bytes to this URL, then receives a storageId.
 */
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

/**
 * Given a Convex storageId (string), return the permanent serving URL.
 * Used as a Convex query from React components (e.g. useQuery).
 */
export const getFileUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId as any);
    },
});

/**
 * HTTP Action: GET /getFileUrl?storageId=<id>
 * Returns { url } JSON — allows non-React callers (e.g. fetch in upload flow)
 * to resolve a storageId to a serving URL immediately after upload.
 */
export const getFileUrlHttp = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");

    if (!storageId) {
        return new Response(JSON.stringify({ error: "Missing storageId" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const fileUrl = await ctx.storage.getUrl(storageId as any);

    return new Response(JSON.stringify({ url: fileUrl }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    });
});
