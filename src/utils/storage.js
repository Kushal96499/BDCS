// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Convex Storage Utilities
// ============================================
// Upload flow:
//   1. generateUploadUrl()  → short-lived upload URL
//   2. PUT/POST file to URL → { storageId }
//   3. getFileUrl(storageId) → permanent serving URL

/**
 * Upload a file to Convex Storage.
 *
 * @param {File}     file                - The File object to upload
 * @param {Function} generateUploadUrl   - Convex mutation: api.files.generateUploadUrl
 * @param {Function} getFileUrl          - Convex query fn: (storageId) => url string | null
 * @returns {Promise<{ storageId: string, url: string }>}
 */
export async function uploadFileToConvex(file, generateUploadUrl, getFileUrl) {
    // Step 1 — get a short-lived upload URL from Convex
    const uploadUrl = await generateUploadUrl();

    // Step 2 — upload the raw file bytes to that URL
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Convex upload failed: ${response.statusText}`);
    }

    const { storageId } = await response.json();

    // Step 3 — resolve the permanent serving URL
    const url = await getFileUrl(storageId);

    if (!url) {
        throw new Error('Convex returned no URL for storageId: ' + storageId);
    }

    return { storageId, url };
}
