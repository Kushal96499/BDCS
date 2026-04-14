// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Convex HTTP Router
// ============================================

import { httpRouter } from "convex/server";
import { getFileUrlHttp } from "./files";

const http = httpRouter();

// GET /getFileUrl?storageId=<id>
// Resolves a Convex storageId → serving URL (used during upload flow)
http.route({
    path: "/getFileUrl",
    method: "GET",
    handler: getFileUrlHttp,
});

export default http;
