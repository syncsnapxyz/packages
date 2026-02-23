import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncsnapServer } from "../client";
import {
	createJobHandler,
	createRouteHandler,
	getDownloadUrlHandler,
	getJobHandler,
} from "./route-handlers";

describe("route-handlers", () => {
	const mockFetch = vi.fn();
	const originalEnv = process.env;

	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch);
		process.env = { ...originalEnv, SYNCSNAP_TOKEN: "test-token" };
		mockFetch.mockReset();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.unstubAllGlobals();
	});

	describe("createJobHandler", () => {
		it("returns created job as JSON", async () => {
			const job = {
				id: "job-1",
				projectId: "proj-1",
				status: "pending",
				createdAt: "2025-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(job),
			});

			const client = new SyncsnapServer();
			const POST = createJobHandler(client);
			const res = await POST();
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data).toEqual(job);
		});
	});

	describe("getJobHandler", () => {
		it("returns job when id is provided", async () => {
			const job = {
				id: "job-1",
				projectId: "proj-1",
				status: "completed",
				fileName: "x.jpg",
				createdAt: "",
				updatedAt: "",
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(job),
			});

			const client = new SyncsnapServer();
			const GET = getJobHandler(client);
			const res = await GET(new Request("http://localhost"), {
				params: { id: "job-1" },
			});
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data).toEqual(job);
		});

		it("returns 400 when id is missing", async () => {
			const client = new SyncsnapServer();
			const GET = getJobHandler(client);
			const res = await GET(new Request("http://localhost"), {
				params: {},
			});
			const data = await res.json();

			expect(res.status).toBe(400);
			expect(data.error).toBe("Job id is required");
		});

		it("resolves promise params", async () => {
			const job = {
				id: "job-1",
				projectId: "p",
				status: "pending",
				fileName: null,
				createdAt: "",
				updatedAt: "",
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(job),
			});

			const client = new SyncsnapServer();
			const GET = getJobHandler(client);
			const res = await GET(new Request("http://localhost"), {
				params: Promise.resolve({ id: "job-1" }),
			});

			expect(res.status).toBe(200);
		});
	});

	describe("getDownloadUrlHandler", () => {
		it("returns presigned URL and passes expiration from query", async () => {
			const presigned = {
				url: "https://s3.example.com/dl",
				fileName: "x.jpg",
				expiration: "2025-01-01T01:00:00Z",
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(presigned),
			});

			const client = new SyncsnapServer();
			const GET = getDownloadUrlHandler(client);
			const res = await GET(
				new Request("http://localhost?id=job-1&expiration=30"),
				{ params: { id: "job-1" } },
			);
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data).toEqual(presigned);
		});
	});

	describe("createRouteHandler", () => {
		it("GET /job/:id returns job", async () => {
			const job = {
				id: "job-1",
				projectId: "p",
				status: "pending",
				fileName: null,
				createdAt: "",
				updatedAt: "",
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(job),
			});

			const client = new SyncsnapServer();
			const { GET } = createRouteHandler({ client });
			const res = await GET(new Request("http://localhost"), {
				params: { syncsnap: ["job", "job-1"] },
			});
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data).toEqual(job);
		});

		it("POST /job creates job", async () => {
			const job = {
				id: "job-1",
				projectId: "p",
				status: "pending",
				createdAt: "",
				updatedAt: "",
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(job),
			});

			const client = new SyncsnapServer();
			const { POST } = createRouteHandler({ client });
			const res = await POST(new Request("http://localhost"), {
				params: { syncsnap: ["job"] },
			});
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data).toEqual(job);
		});

		it("GET returns 404 for unknown path", async () => {
			const client = new SyncsnapServer();
			const { GET } = createRouteHandler({ client });
			const res = await GET(new Request("http://localhost"), {
				params: { syncsnap: ["unknown"] },
			});
			const data = await res.json();

			expect(res.status).toBe(404);
			expect(data.error).toBe("Not found");
		});

		it("POST returns 404 for unknown path", async () => {
			const client = new SyncsnapServer();
			const { POST } = createRouteHandler({ client });
			const res = await POST(new Request("http://localhost"), {
				params: { syncsnap: ["other"] },
			});

			expect(res.status).toBe(404);
		});
	});
});