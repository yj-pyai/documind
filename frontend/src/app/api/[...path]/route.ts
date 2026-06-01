import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path.join("/"), "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path.join("/"), "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path.join("/"), "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path.join("/"), "DELETE");
}

async function proxy(
  request: NextRequest,
  apiPath: string,
  method: string,
): Promise<NextResponse> {
  const url = `${API_BASE}/api/${apiPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host" && key.toLowerCase() !== "content-length") {
      headers[key] = value;
    }
  });

  try {
    let body: BodyInit | null | undefined;

    if (method !== "GET" && method !== "HEAD") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        body = await request.formData();
      } else if (contentType.includes("application/json")) {
        body = await request.text();
      } else {
        body = await request.text();
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
      },
      body,
    });

    // For SSE responses, pass through
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.text();
    let json: any;
    try {
      json = JSON.parse(data);
    } catch {
      json = data;
    }

    return NextResponse.json(json, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "content-type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Proxy error" },
      { status: 502 }
    );
  }
}
