import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// toBeDisabled / toHaveTextContent などのDOM向けアサーションを足す
import "@testing-library/jest-dom/vitest";

// jsdomを使うテストで、前のテストのDOMが残らないようにする。
// Node環境のテストではdocumentが無いので何もしない。
afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});
