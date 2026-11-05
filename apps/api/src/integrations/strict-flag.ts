import type { ConfigReader } from './integrations.config';

/** Strict boolean flag: absent → false; anything but true/false stops startup. */
export function strictFlag(config: ConfigReader, name: string): boolean {
  const flag = config.get(name);
  if (
    ![undefined, true, false, 'true', 'false'].includes(
      flag as boolean | string | undefined,
    )
  )
    throw new Error(name + ' must be true or false');
  return flag === true || flag === 'true';
}
