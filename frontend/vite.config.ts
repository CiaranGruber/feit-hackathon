import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type LogLevel } from 'vite'
import {readFileSync} from "node:fs";
import {parse} from "smol-toml";

const DEFAULT_PORT = 6485

const LogLevels = {
  Info: "info",
  Warn: "warn",
  Error: "error",
  Silent: "silent",
} as const satisfies Record<string, LogLevel>

/**
 * The publicly available config that all clients have access to
 * This format should be identical to __APP_CONFIG__ in vite-env.d.ts
 */
interface PublicConfig {
  backendUrl: string
}

interface AppConfig {
  port: number
  logLevel: LogLevel
  public: PublicConfig
}

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

/**
 * Loads the configuration file at the given path
 * @param path The path to load the config from
 */
function loadConfig(path: string): Record<string, unknown> {
  try {
    return parse(readFileSync(path, "utf8")) as Record<string, unknown>
  } catch {
    console.log("Config file not found - using defaults")
    return {}
  }
}

/**
 * Validates a certain configuration option resulting in the default value if null or
 * @param value The value to validate. Leave as null for no value provided
 * @param validator The validator use to check the value
 * @param defaultValue The default value to fall back to if the validator fails. Set as null to raise an exception for invalid values
 */
function validate<T>(value: T | null, validator: (value: T) => boolean, defaultValue: T | null = null): T {
  if (value != null && validator(value)) {
    return value
  }
  if (defaultValue != null) {
    return defaultValue
  }
  throw new RangeError(`Unexpected configuration value: ${value}`)
}

/**
 * Converts a value of unknown type to a record
 * @param value The value to convert
 */
// function asRecord(value: unknown): Record<string, unknown> {
//   return value !== null && typeof value === "object" ? value as Record<string, unknown> : {}
// }

/**
 * Ensures the value is of the same type as the check value, converting to null or returning the check if not
 * @param value The value to check
 * @param check The check value which has the same type to convert to
 * @param useCheckAsFallback True, to use the check as the fallback value else will return null if the check is failed
 */
function asType<T>(value: unknown, check: T, useCheckAsFallback: boolean = false): T | null {
  return typeof value == typeof check
    ? value as T
    : (useCheckAsFallback ? check : null)
}

/**
 * Checks if the given value is a valid URL
 * @param value The value to check
 */
function isURL(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function toLogLevel(value: string): LogLevel {
  const normalised = value.toLowerCase()
  return (Object.values(LogLevels) as string[]).includes(normalised)
    ? normalised as LogLevel
    : LogLevels.Info
}

// ------------------------------------------------------
// Config compilation
// ------------------------------------------------------

/**
 * Compiles the configuration from the config.toml, validating each parameter according to their specific rules
 */
function compileConfig(): AppConfig {
  let raw = loadConfig(process.env.NO_IDEA_FE_CONFIG ?? "./config.toml")

  // Set basic defaults
  const port = validate(asType(raw.port, 0), x => 1000 < x && x < 65535, DEFAULT_PORT)
  const logLevel = toLogLevel(validate(
    asType(raw.logLevel, ""),
    value => (Object.values(LogLevels) as string[]).includes(value.toLowerCase()),
    LogLevels.Info
  ))
  const backendUrl = new URL(validate(asType(raw.backendUrl, ""), x => isURL(x), "http://localhost:6486"))


  // Return app config
  return {
    port: port,
    logLevel: logLevel,
    public: {
      backendUrl: backendUrl.origin,
    }
  }
}

const config = compileConfig()

// https://vite.dev/config/
export default defineConfig({
  server: { port: config.port },
  logLevel: config.logLevel,
  plugins: [react(), tailwindcss()],
  define: {
    __APP_CONFIG__: JSON.stringify(config.public)
  },
})
