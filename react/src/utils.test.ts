import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadUrl, fetchJson } from "./utils";

describe("createUploadUrl", () => {
	it("returns URL with default base and job_id param", () => {
		const url = createUploadUrl("job-123");
		expect(url).toBe("https://upload.syncsnap.xyz/?job_id=job-123");
	});

	it("uses custom baseUrl when provided", () => {
		const url = createUploadUrl("job-456", {
			baseUrl: "https://custom.example.com/",
		});
		expect(url).toBe("https://custom.example.com/?job_id=job-456");
	});

	it("encodes jobId in query", () => {
		const url = createUploadUrl("job/with/special");
		expect(url).toContain("job_id=job%2Fwith%2Fspecial");
	});
});

describe("fetchJson", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns parsed JSON on ok response", async () => {
		const data = { id: "1", name: "test" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(data),
			}),
		);

		const result = await fetchJson<typeof data>("https://api.example.com/");
		expect(result).toEqual(data);
	});

	it("throws with API error message when response has error field", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ error: "Bad request" }),
			}),
		);

		await expect(fetchJson("https://api.example.com/")).rejects.toThrow(
			"Bad request",
		);
	});

	it("throws with status message when response not ok and no error field", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				json: () => Promise.resolve({}),
			}),
		);

		await expect(fetchJson("https://api.example.com/")).rejects.toThrow(
			"Syncsnap request failed (500)",
		);
	});
});
