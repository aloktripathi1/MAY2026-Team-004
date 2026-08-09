"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: (options: {
      url: string;
      domNode: HTMLElement | null;
      deepLinking?: boolean;
      tryItOutEnabled?: boolean;
      persistAuthorization?: boolean;
    }) => void;
  }
}

const SWAGGER_UI_VERSION = "5.17.14";

export function ApiDocsClient() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css`;
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js`;
    script.async = true;
    script.onload = () => {
      window.SwaggerUIBundle?.({
        url: "/api/openapi",
        domNode: container,
        deepLinking: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
      });
    };
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
      container.replaceChildren();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="border-b border-neutral-200 px-6 py-4">
        <p className="text-sm text-neutral-600">
          Same-origin Try it out against this app. Prefer this over{" "}
          <a
            className="underline underline-offset-2"
            href="https://editor.swagger.io/"
            target="_blank"
            rel="noreferrer"
          >
            editor.swagger.io
          </a>{" "}
          (browsers block HTTPS → HTTP localhost).
        </p>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
