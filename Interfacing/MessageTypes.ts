import {
  IsObject,
  DoNotCare,
  IsString,
  IsArray,
  IsLiteral,
  IsType,
} from "../deps/type_guard.ts";

export const IsStartCommand = IsObject({
  type: IsLiteral("start"),
  context: DoNotCare,
  request_id: IsString,
});

export type StartCommand = IsType<typeof IsStartCommand>;

export const IsCommand = IsObject({
  request_id: IsString,
  command: IsString,
  args: IsArray(DoNotCare),
});

export type Command = IsType<typeof IsCommand>;

export const IsResponse = IsObject({
  request_id: IsString,
  response: DoNotCare,
});

export type Response = IsType<typeof IsResponse>;
