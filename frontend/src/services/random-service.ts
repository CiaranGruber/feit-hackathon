import {callApi} from "./api.ts";

export async function getHello(): Promise<string> {
  const result = await callApi("/")
  if (!result.ok) {
    throw new Error(`GET / failed (${result.status})`)
  }
  return result.body.message as string;
}